// middleware/rateLimiter.js - Rate limiting for production
import rateLimit from 'express-rate-limit';
import { logSecurity } from '../utils/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Забагато запитів з цієї IP адреси, спробуйте пізніше.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logSecurity('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Strict limiter for analysis endpoints
export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.ANALYSIS_RATE_LIMIT) || 10, // limit each IP to 10 analysis requests per hour
  message: {
    error: 'Ліміт аналізів перевищено. Спробуйте через годину.',
    retryAfter: '1 hour'
  },
  skip: (req) => {
    // Skip rate limiting for authenticated users with higher limits
    return req.cookies?.auth === 'authorized' && req.user?.premium;
  },
  handler: (req, res, next, options) => {
    logSecurity('Analysis rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      authenticated: !!req.cookies?.auth
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Login rate limiter (stricter)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    error: 'Забагато спроб входу. Спробуйте через 15 хвилин.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res, next, options) => {
    logSecurity('Login rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      username: req.body?.username
    });
    res.status(options.statusCode).json(options.message);
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 file uploads per hour
  message: {
    error: 'Ліміт завантажень файлів перевищено.',
    retryAfter: '1 hour'
  }
});