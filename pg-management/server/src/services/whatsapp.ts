import makeWASocket, { useMultiFileAuthState, DisconnectReason, BufferJSON } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { prisma } from '../index.js';
import { checkRateLimit } from './rateLimiter.js';
import pino from 'pino';
import fs from 'fs';

const logger = pino({ level: 'warn' });

interface SocketData {
  sock: ReturnType<typeof makeWASocket> | null;
  qrData: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const sockets: Map<string, SocketData> = new Map();

function getAuthDir(userId: string): string {
  return `./auth/${userId}`;
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

    const authDir = getAuthDir(userId);
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
        const serializedState = JSON.stringify(state, BufferJSON.replacer);
        await prisma.whatsAppSession.upsert({
          where: { userId },
          update: { connected: true, sessionData: serializedState },
          create: { userId, connected: true, sessionData: serializedState },
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

  if (!data?.sock || data.connectionStatus !== 'connected') {
    const session = await prisma.whatsAppSession.findUnique({ where: { userId } });
    if (!session?.connected) {
      return 'FAILED';
    }

    await connectWhatsApp(userId);
    return 'PENDING';
  }

  try {
    const jid = formatPhoneNumber(phoneNumber);
    if (imageBase64) {
      await data.sock.sendMessage(jid, {
        image: Buffer.from(imageBase64, 'base64'),
        caption: message,
      });
    } else {
      await data.sock.sendMessage(jid, { text: message });
    }
    return 'SENT';
  } catch (error) {
    console.error('Send message error:', error);
    return 'FAILED';
  }
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');

  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  return cleaned + '@s.whatsapp.net';
}
