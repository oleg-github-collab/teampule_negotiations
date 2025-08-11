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

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [/\.railway\.app$/]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, 'public')));

// API
app.use('/api', analyzeRoutes);
app.use('/api', clientsRoutes); // <-- було '/api/clients'
app.use('/api', adviceRoutes);  // <-- було '/api/advice'

// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// App
app.get('/', (_req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TeamPulse Turbo running on :${PORT}`);
});
