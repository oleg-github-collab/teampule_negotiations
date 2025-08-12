// utils/logger.js - Production logging system
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'teampulse-turbo' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // API access logs
    new winston.transports.File({
      filename: join(logsDir, 'api.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport for non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Helper functions
export const logAPI = (req, res, responseTime) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    responseTime,
    statusCode: res.statusCode,
    contentLength: res.get('content-length')
  });
};

export const logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

export const logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    details
  });
};

export const logAIUsage = (tokens, model, operation) => {
  logger.info('AI Usage', {
    tokens,
    model,
    operation,
    timestamp: new Date().toISOString()
  });
};

// Railway-specific logging
export const logRailwayDeploy = (stage, details = {}) => {
  logger.info('Railway Deployment', {
    stage,
    details,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    railwayServiceId: process.env.RAILWAY_SERVICE_ID,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT
  });
};

// Enhanced error logging for debugging
export const logDetailedError = (error, req, additionalContext = {}) => {
  const errorDetails = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status || error.statusCode
    },
    request: {
      method: req?.method,
      url: req?.url,
      ip: req?.ip,
      userAgent: req?.get?.('User-Agent'),
      headers: req?.headers,
      body: req?.body ? JSON.stringify(req.body).substring(0, 500) : undefined
    },
    system: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    ...additionalContext
  };
  
  logger.error('Detailed Error Report', errorDetails);
  return errorDetails;
};

// Client-side error logging
export const logClientError = (errorData, req) => {
  logger.error('Client-Side Error', {
    clientError: errorData,
    userAgent: req?.get?.('User-Agent'),
    ip: req?.ip,
    timestamp: new Date().toISOString()
  });
};

export default logger;