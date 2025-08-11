// server.js - Головний сервер
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import analyzeRoutes from './routes/analyze.js';
import clientsRoutes from './routes/clients.js';
import adviceRoutes from './routes/advice.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [/.railway.app$/]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
// compression — вимкнути для SSE
const shouldCompress = (req, res) => {
  if (req.path.startsWith('/api/analyze')) return false;
  return compression.filter(req, res);
};
app.use(compression({ filter: shouldCompress }));
app.use(morgan('combined'));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Static files
app.use(express.static(join(__dirname, 'public')));

// Simple auth middleware
const authMiddleware = (req, res, next) => {
  // For API requests, return JSON error instead of redirect
  if (req.path.startsWith('/api/')) {
    if (req.cookies?.auth === 'authorized') {
      next();
    } else {
      return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
    }
  } else {
    // For page requests, redirect to login
    if (req.cookies?.auth === 'authorized') {
      next();
    } else {
      return res.redirect('/login');
    }
  }
};

// Auth routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'janeDVDops' && password === 'jane2210') {
    res.cookie('auth', 'authorized', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ success: true });
});

// Token usage endpoint
app.get('/api/usage', authMiddleware, (req, res) => {
  // Mock data - replace with real implementation
  res.json({ 
    used_tokens: 125000, 
    total_tokens: 512000, 
    percentage: 24.4,
    reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// Client error logging endpoint
app.post('/api/log-error', (req, res) => {
  const { error, url, line, column, stack } = req.body;
  console.error('🐛 Client error:', {
    error: error?.toString() || 'Unknown error',
    url,
    line,
    column,
    stack,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  res.status(200).json({ logged: true });
});

// API routes (protected)
app.use('/api/analyze', authMiddleware, analyzeRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/advice', authMiddleware, adviceRoutes);

// Health check
app.get('/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// App routes
app.get('/login', (_req, res) =>
  res.sendFile(join(__dirname, 'public', 'login.html'))
);

app.get('/', (req, res) => {
  // Check if user is authenticated
  if (req.cookies?.auth === 'authorized') {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? err.message : 'Something went wrong',
    ...(isDev && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  console.warn(`404 - ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚡ Shutting down TeamPulse Turbo...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 TeamPulse Turbo v3.0 running on :${PORT} (${env})`);
  console.log(`📊 Daily token limit: ${Number(process.env.DAILY_TOKEN_LIMIT || 512000).toLocaleString()}`);
  console.log(`🤖 AI Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
});
