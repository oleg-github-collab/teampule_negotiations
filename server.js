// server.js - Production TeamPulse Turbo Server
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Import custom middleware and utilities
import logger, { logError, logSecurity, logAPI } from './utils/logger.js';
import { apiLimiter, loginLimiter, analysisLimiter } from './middleware/rateLimiter.js';
import { validateSecurityHeaders } from './middleware/validators.js';

import analyzeRoutes from './routes/analyze.js';
import clientsRoutes from './routes/clients.js';
import adviceRoutes from './routes/advice.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Create necessary directories
const dataDir = dirname(process.env.DB_PATH || './data/teampulse.db');
const logsDir = './logs';
[dataDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for production deployments
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security & middleware
app.use(validateSecurityHeaders);

app.use(
  cors({
    origin: isProduction
      ? [/.railway.app$/, /.vercel.app$/, /.herokuapp.com$/]
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Enhanced security headers for production
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);
// compression — вимкнути для SSE
const shouldCompress = (req, res) => {
  if (req.path.startsWith('/api/analyze')) return false;
  return compression.filter(req, res);
};
app.use(compression({ filter: shouldCompress }));
// Custom logging middleware
if (isProduction) {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
} else {
  app.use(morgan('dev'));
}

// Request timing middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    if (req.path.startsWith('/api/')) {
      logAPI(req, res, responseTime);
    }
    originalSend.call(this, data);
  };
  
  next();
});
// Body parsing with limits
const bodyLimit = process.env.MAX_FILE_SIZE || '50mb';
app.use(express.json({ 
  limit: bodyLimit,
  verify: (req, res, buf) => {
    if (buf.length > 100 * 1024 * 1024) { // 100MB absolute limit
      throw new Error('Request too large');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: bodyLimit,
  parameterLimit: 1000
}));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Static files
app.use(express.static(join(__dirname, 'public')));

// Enhanced auth middleware with security logging
const authMiddleware = (req, res, next) => {
  const isAuthenticated = req.cookies?.auth === 'authorized';
  
  if (!isAuthenticated) {
    logSecurity('Unauthorized access attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
  }
  
  // For API requests, return JSON error instead of redirect
  if (req.path.startsWith('/api/')) {
    if (isAuthenticated) {
      next();
    } else {
      return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
    }
  } else {
    // For page requests, redirect to login
    if (isAuthenticated) {
      next();
    } else {
      return res.redirect('/login');
    }
  }
};

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Auth routes with enhanced security
app.post('/api/login', loginLimiter, (req, res) => {
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

// Database cleanup endpoint (for removing test data)
app.post('/api/admin/cleanup-database', authMiddleware, async (req, res) => {
  try {
    const { confirmCode } = req.body;
    
    // Require confirmation code for safety
    if (confirmCode !== 'CLEANUP_TEST_DATA_2024') {
      return res.status(400).json({ 
        error: 'Invalid confirmation code',
        required: 'CLEANUP_TEST_DATA_2024'
      });
    }

    // Import database functions
    const { run } = await import('./utils/db.js');
    
    // Delete all analyses first (due to foreign key constraints)
    const analysesDeleted = run('DELETE FROM analyses');
    
    // Delete all clients
    const clientsDeleted = run('DELETE FROM clients');
    
    // Reset auto-increment counters
    run('DELETE FROM sqlite_sequence WHERE name IN ("clients", "analyses")');
    
    // Log the cleanup
    logSecurity('Database cleanup performed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      analysesDeleted: analysesDeleted.changes,
      clientsDeleted: clientsDeleted.changes,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'База даних очищена успішно',
      deleted: {
        clients: clientsDeleted.changes,
        analyses: analysesDeleted.changes
      }
    });
    
  } catch (error) {
    logError(error, { endpoint: 'POST /api/admin/cleanup-database', ip: req.ip });
    res.status(500).json({
      error: 'Помилка очищення бази даних',
      details: error.message
    });
  }
});

// API routes (protected) with specific rate limiting
app.use('/api/analyze', authMiddleware, analysisLimiter, analyzeRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/advice', authMiddleware, adviceRoutes);

// Enhanced health check for Railway
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  // Check database connectivity
  try {
    const { get } = await import('./utils/db.js');
    get('SELECT 1 as test');
    healthStatus.checks.database = 'healthy';
  } catch (dbError) {
    healthStatus.checks.database = 'unhealthy';
    healthStatus.status = 'degraded';
    logError(dbError, { context: 'Health check database test' });
  }

  // Check OpenAI client availability and circuit breaker status
  try {
    const { client, getCircuitBreakerStatus } = await import('./utils/openAIClient.js');
    const cbStatus = getCircuitBreakerStatus();
    
    healthStatus.checks.ai_service = {
      available: client ? true : false,
      circuit_breaker: cbStatus.state,
      failures: cbStatus.failures,
      retry_in_seconds: Math.ceil(cbStatus.timeUntilRetry / 1000)
    };
    
    if (!client || cbStatus.state === 'OPEN') {
      healthStatus.status = 'degraded';
    }
  } catch (aiError) {
    healthStatus.checks.ai_service = {
      available: false,
      error: 'Failed to check AI service status'
    };
    healthStatus.status = 'degraded';
  }

  // Check file system (logs directory)
  try {
    const fs = await import('fs');
    fs.default.accessSync('./logs', fs.default.constants.W_OK);
    healthStatus.checks.filesystem = 'healthy';
  } catch (fsError) {
    healthStatus.checks.filesystem = 'unhealthy';
    healthStatus.status = 'degraded';
  }

  healthStatus.response_time_ms = Date.now() - startTime;

  // Set appropriate status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

// Simplified health check for load balancers
app.get('/ping', (_req, res) => res.send('pong'));

// Ready check for Kubernetes/Railway
app.get('/ready', async (_req, res) => {
  try {
    // Basic functionality test
    const { get } = await import('./utils/db.js');
    get('SELECT 1');
    res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

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

// Enhanced global error handler with recovery mechanisms
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(2, 15);
  
  logError(err, {
    errorId,
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    body: req.path?.startsWith('/api/') ? '[REDACTED]' : req.body,
    headers: {
      'content-type': req.get('Content-Type'),
      'user-agent': req.get('User-Agent'),
      'referer': req.get('Referer')
    },
    stack: err.stack
  });
  
  // Prevent hanging requests
  if (res.headersSent) {
    return next(err);
  }
  
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  // Determine error type and status
  let statusCode = err.status || err.statusCode || 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let userMessage = 'Внутрішня помилка сервера';
  
  // Handle specific error types
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    userMessage = 'Сервіс тимчасово недоступний';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'REQUEST_TIMEOUT';
    userMessage = 'Тайм-аут запиту. Спробуйте пізніше';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    userMessage = 'Некоректні дані запиту';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_DATA_FORMAT';
    userMessage = 'Неправильний формат даних';
  } else if (err.message?.includes('ENOTFOUND')) {
    statusCode = 503;
    errorCode = 'EXTERNAL_SERVICE_ERROR';
    userMessage = 'Помилка зовнішнього сервісу';
  }
  
  const errorResponse = {
    error: userMessage,
    code: errorCode,
    timestamp: new Date().toISOString(),
    requestId: errorId
  };
  
  // Add debug info for development
  if (!isProduction) {
    errorResponse.debug = {
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 10), // Limit stack trace
      originalError: err.name
    };
  }
  
  // Add retry information for specific errors
  if ([503, 504, 429].includes(statusCode)) {
    errorResponse.retry_after = statusCode === 429 ? 60 : 30; // seconds
  }
  
  res.status(statusCode).json(errorResponse);
});

// Enhanced 404 handler with logging
app.use((req, res) => {
  logSecurity('404 - Resource not found', {
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  
  res.status(404).json({ 
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('✅ TeamPulse Turbo shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Enhanced error handling with recovery attempts
process.on('uncaughtException', (err) => {
  const errorId = Math.random().toString(36).substring(2, 15);
  
  logError(err, { 
    type: 'uncaughtException',
    errorId,
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
  
  logger.error(`💥 Uncaught exception [${errorId}] - ${err.message}`);
  
  // Try to close server gracefully
  if (server) {
    server.close((closeErr) => {
      if (closeErr) {
        logger.error('Error during emergency server shutdown:', closeErr.message);
      }
      process.exit(1);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('⚠️ Forced exit after uncaught exception');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const errorId = Math.random().toString(36).substring(2, 15);
  
  logError(new Error(`Unhandled rejection: ${reason}`), { 
    type: 'unhandledRejection',
    errorId,
    promise: promise.toString().substring(0, 500), // Limit promise string length
    stack: reason?.stack || 'No stack available'
  });
  
  logger.error(`💥 Unhandled rejection [${errorId}] - ${reason}`);
  
  // For unhandled rejections, try to continue running but monitor
  logger.warn('⚠️ Attempting to continue after unhandled rejection - monitoring stability');
  
  // If too many unhandled rejections occur quickly, shut down
  if (!global._rejectionCount) global._rejectionCount = 0;
  global._rejectionCount++;
  
  setTimeout(() => {
    if (global._rejectionCount > 0) global._rejectionCount--;
  }, 60000); // Reset count after 1 minute
  
  if (global._rejectionCount > 5) {
    logger.error('💥 Too many unhandled rejections - shutting down for stability');
    process.exit(1);
  }
});

// Handle SIGPIPE errors (broken pipes)
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received - client disconnected');
});

// Monitor for high memory usage
process.on('warning', (warning) => {
  logger.warn('Node.js warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Memory usage monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed / 1024 / 1024 > 500) { // Log if using more than 500MB
    logger.warn('High memory usage detected', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    });
  }
}, 60000); // Check every minute

// Start server with enhanced production features
const server = app.listen(PORT, HOST, () => {
  const env = process.env.NODE_ENV || 'development';
  logger.info(`🚀 TeamPulse Turbo v3.0 running on ${HOST}:${PORT} (${env})`);
  logger.info(`📊 Daily token limit: ${Number(process.env.DAILY_TOKEN_LIMIT || 512000).toLocaleString()}`);
  logger.info(`🤖 AI Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
  logger.info(`🔒 Security features enabled: ${isProduction ? 'YES' : 'NO'}`);
  logger.info(`📝 Logging level: ${process.env.LOG_LEVEL || 'info'}`);
});

// Server timeout configuration
server.timeout = 120000; // 2 minutes
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
