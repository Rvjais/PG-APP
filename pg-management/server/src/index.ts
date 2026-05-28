import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import buildingRoutes from './routes/buildings.js';
import tenantRoutes from './routes/tenants.js';
import customFieldRoutes from './routes/customFields.js';
import templateRoutes from './routes/templates.js';
import messageRoutes from './routes/messages.js';
import schedulerRoutes from './routes/scheduler.js';
import schedulerTriggerRoutes from './routes/schedulerTrigger.js';
import whatsappRoutes from './routes/whatsapp.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiter behind load balancers
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS - allow all for mobile apps and web origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps like Capacitor)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Allow if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    // BUG FIX: Only allow localhost in development, not production
    // Use proper hostname check instead of substring match
    if (process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          callback(null, true);
          return;
        }
      } catch {}
    }
    // Block unknown origins in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`CORS blocked: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/scheduler/reminders', schedulerRoutes);
app.use('/api/scheduler', schedulerTriggerRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    startScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export default app;