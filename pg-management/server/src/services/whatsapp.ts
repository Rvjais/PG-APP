import makeWASocket, { useMultiFileAuthState, DisconnectReason, BufferJSON } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { prisma } from '../index.js';
import { checkRateLimit } from './rateLimiter.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = pino({ level: 'warn' });

// BUG #3 FIX: use an absolute path anchored to this file's location so it
// works regardless of the process working directory (dev vs production).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_BASE_DIR = process.env.AUTH_DIR || path.join(__dirname, '../../auth');

interface SocketData {
  sock: ReturnType<typeof makeWASocket> | null;
  qrData: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const sockets: Map<string, SocketData> = new Map();

function getAuthDir(userId: string): string {
  return path.join(AUTH_BASE_DIR, userId);
}

function clearAuthDir(userId: string): void {
  const authDir = getAuthDir(userId);
  if (fs.existsSync(authDir)) {
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log(`Cleared auth state for user ${userId}`);
    } catch (e) {
      console.error(`Failed to clear auth dir for ${userId}:`, e);
    }
  }
}

export async function connectWhatsApp(userId: string, forceFresh?: boolean): Promise<{ status: string; qrData?: string }> {
  const existing = sockets.get(userId);
  if (existing?.connectionStatus === 'connected') {
    return { status: 'already_connected' };
  }

  if (existing?.sock) {
    try {
      existing.sock.end(undefined);
    } catch {}
  }

  sockets.set(userId, { sock: null, qrData: null, connectionStatus: 'connecting' });

  try {
    if (forceFresh) clearAuthDir(userId);

    // Ensure auth directory exists with absolute path (BUG #3 FIX)
    const authDir = getAuthDir(userId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      logger,
      auth: state,
      browser: ['Ubuntu', 'Chrome', '22.04.4'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sockets.set(userId, { sock, qrData: null, connectionStatus: 'connecting' });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        sockets.set(userId, { sock, qrData: qr, connectionStatus: 'connecting' });
      }

      if (connection === 'open') {
        sockets.set(userId, { sock, qrData: null, connectionStatus: 'connected' });
        await prisma.whatsAppSession.upsert({
          where: { userId },
          update: { connected: true },
          create: { userId, connected: true },
        });
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const isLoggedOut = error instanceof Boom && error?.output?.statusCode === DisconnectReason.loggedOut;
        const isRestartRequired = error?.message?.includes('restart required');

        if (isLoggedOut) {
          clearAuthDir(userId);
          sockets.set(userId, { sock: null, qrData: null, connectionStatus: 'disconnected' });
          await prisma.whatsAppSession.updateMany({
            where: { userId },
            data: { connected: false },
          });
        } else if (isRestartRequired) {
          sockets.set(userId, { sock: null, qrData: null, connectionStatus: 'disconnected' });
          setTimeout(() => connectWhatsApp(userId).catch(() => {}), 2000);
        } else {
          sockets.set(userId, { sock, qrData: null, connectionStatus: 'connecting' });
        }
      }
    });

    // BUG #8 FIX: creds.update is the authoritative event for saving credentials.
    sock.ev.on('creds.update', saveCreds);

    return { status: 'connecting', qrData: undefined };
  } catch (error) {
    console.error('WhatsApp connection error:', error);
    sockets.set(userId, { sock: null, qrData: null, connectionStatus: 'error' });
    throw error;
  }
}

export async function disconnectWhatsApp(userId: string): Promise<void> {
  const data = sockets.get(userId);
  if (data?.sock) {
    try {
      await data.sock.logout();
    } catch {}
  }

  clearAuthDir(userId);
  sockets.set(userId, { sock: null, qrData: null, connectionStatus: 'disconnected' });

  await prisma.whatsAppSession.updateMany({
    where: { userId },
    data: { connected: false },
  });
}

export function getConnectionStatus(userId: string): string {
  return sockets.get(userId)?.connectionStatus || 'disconnected';
}

export function getQRCode(userId: string): string | null {
  return sockets.get(userId)?.qrData || null;
}

export async function sendWhatsAppMessage(
  userId: string,
  phoneNumber: string,
  message: string,
  imageBase64?: string
): Promise<'SENT' | 'FAILED' | 'PENDING'> {
  const rateCheck = await checkRateLimit(userId);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit hit for user ${userId}: ${rateCheck.reason}`);
    return 'FAILED';
  }

  const data = sockets.get(userId);

  // FIX: If socket is disconnected but DB says connected, try to reconnect and wait
  if (!data?.sock || data.connectionStatus !== 'connected') {
    const session = await prisma.whatsAppSession.findUnique({ where: { userId } });
    if (!session?.connected) {
      return 'FAILED';
    }

    // Await reconnection before attempting to send
    try {
      await connectWhatsApp(userId);

      // Poll for connection status instead of fixed timeout
      const maxWaitMs = 10000;
      const pollIntervalMs = 500;
      const startTime = Date.now();
      let connected = false;

      while (Date.now() - startTime < maxWaitMs) {
        const currentData = sockets.get(userId);
        if (currentData?.connectionStatus === 'connected' && currentData?.sock) {
          connected = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }

      if (!connected) {
        return 'FAILED'; // Reconnection timed out
      }

      // Use the reconnected socket
      const reconnectedData = sockets.get(userId)!;
      if (!reconnectedData?.sock) {
        return 'FAILED'; // Socket not available
      }
      const jid = formatPhoneNumber(phoneNumber);
      if (imageBase64) {
        await reconnectedData.sock.sendMessage(jid, {
          image: Buffer.from(imageBase64, 'base64'),
          caption: message,
        });
      } else {
        await reconnectedData.sock.sendMessage(jid, { text: message });
      }
      return 'SENT';
    } catch {
      return 'FAILED'; // Reconnection threw
    }
  }

  // Socket was already connected
  try {
    const jid = formatPhoneNumber(phoneNumber);
    if (imageBase64) {
      await data.sock!.sendMessage(jid, {
        image: Buffer.from(imageBase64, 'base64'),
        caption: message,
      });
    } else {
      await data.sock!.sendMessage(jid, { text: message });
    }
    return 'SENT';
  } catch (error) {
    console.error('Send message error:', error);
    return 'FAILED';
  }
}

// BUG #13 FIX: phone number formatter is no longer hardcoded to India (+91).
// If the number already contains a country code prefix (length > 10 after
// stripping non-digits), we use it as-is. Only 10-digit numbers without a
// known country code fall back to the India prefix so existing behaviour is
// preserved for users who have Indian tenants. Set PHONE_COUNTRY_CODE in .env
// to override the default fallback country code.
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  const fallbackCountryCode = process.env.PHONE_COUNTRY_CODE || '91';

  // If the number is exactly 10 digits it has no country code — prepend fallback
  if (cleaned.length === 10) {
    cleaned = fallbackCountryCode + cleaned;
  }
  // Numbers already containing a country code (> 10 digits) are used as-is

  return cleaned + '@s.whatsapp.net';
}
