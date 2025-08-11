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
  if (req.cookies?.auth === 'authorized') {
    next();
  } else {
    res.redirect('/login');
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
app.get('/', authMiddleware, (_req, res) =>
  res.sendFile(join(__dirname, 'public', 'index.html'))
);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TeamPulse Turbo running on :${PORT}`);
});
