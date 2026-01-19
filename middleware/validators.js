// middleware/validators.js - Input validation for production security
import { body, param, query, validationResult } from 'express-validator';
import { logSecurity } from '../utils/logger.js';

const parseSizeToBytes = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)(kb|mb|gb)?$/);
  if (!match) return fallback;
  const number = Number(match[1]);
  const unit = match[2] || 'b';
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return Math.round(number * (multipliers[unit] || 1));
};

// Helper to handle validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logSecurity('Validation failed', {
      ip: req.ip,
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    return res.status(400).json({
      error: 'Помилка валідації даних',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Login validation
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Ім\'я користувача має містити від 3 до 50 символів')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Ім\'я користувача може містити тільки букви, цифри та знак підкреслення'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Пароль має містити від 6 до 100 символів'),
  
  handleValidationErrors
];

// Client validation
export const validateClient = [
  body('company')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Назва компанії обов\'язкова (до 200 символів)')
    .escape(),
  
  body('negotiator')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ім\'я переговорника не може перевищувати 100 символів')
    .escape(),
  
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Сфера діяльності не може перевищувати 50 символів')
    .escape(),
  
  body('weekly_hours')
    .optional()
    .isInt({ min: 0, max: 168 })
    .withMessage('Кількість годин на тиждень має бути від 0 до 168'),
  
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Опис цілі не може перевищувати 1000 символів')
    .escape(),
  
  body('decision_criteria')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Критерії рішення не можуть перевищувати 1000 символів')
    .escape(),
  
  body('constraints')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Обмеження не можуть перевищувати 1000 символів')
    .escape(),
  
  // New fields validation
  body('company_size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large'])
    .withMessage('Розмір компанії має бути одним з: startup, small, medium, large'),
  
  body('negotiation_type')
    .optional()
    .isIn(['sales', 'partnership', 'contract', 'investment', 'acquisition', 'licensing', 'other'])
    .withMessage('Тип переговорів має бути одним з: sales, partnership, contract, investment, acquisition, licensing, other'),
  
  body('deal_value')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Вартість угоди не може перевищувати 50 символів')
    .escape(),
  
  body('goals')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Цілі не можуть перевищувати 1000 символів')
    .escape(),
  
  handleValidationErrors
];

// Analysis text validation
export const validateAnalysisText = [
  body('text')
    .optional()
    .trim()
    .isLength({ min: 20, max: 100000 })
    .withMessage('Текст має містити від 20 до 100,000 символів'),
  
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('ID клієнта має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Client ID parameter validation
export const validateClientId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID клієнта має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Analysis ID parameter validation
export const validateAnalysisId = [
  param('analysisId')
    .isInt({ min: 1 })
    .withMessage('ID аналізу має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Advice request validation
export const validateAdviceRequest = [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('Має бути передано від 1 до 50 фрагментів для аналізу'),
  
  body('items.*.text')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Кожен фрагмент має містити від 10 до 1000 символів')
    .escape(),
  
  body('items.*.category')
    .optional()
    .isIn(['manipulation', 'cognitive_bias', 'rhetological_fallacy'])
    .withMessage('Категорія має бути одною з: manipulation, cognitive_bias, rhetological_fallacy'),
  
  body('items.*.label')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Мітка не може перевищувати 100 символів')
    .escape(),
  
  handleValidationErrors
];

// File upload validation
export const validateFileUpload = (req, res, next) => {
  // Skip validation for multipart requests - will be handled in parseMultipart
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  
  if (!req.file && !req.body.text) {
    return res.status(400).json({
      error: 'Потрібно завантажити файл або ввести текст'
    });
  }
  
  if (req.file) {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.txt,.docx').split(',');
    const fileExt = '.' + req.file.originalname.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      logSecurity('Invalid file type uploaded', {
        ip: req.ip,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      return res.status(400).json({
        error: `Непідтримуваний тип файлу. Дозволені: ${allowedTypes.join(', ')}`
      });
    }
    
    const maxSize = parseSizeToBytes(process.env.MAX_FILE_SIZE, 50 * 1024 * 1024);
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: `Файл занадто великий. Максимальний розмір: ${Math.round(maxSize / 1024 / 1024)}MB`
      });
    }
  }
  
  next();
};

// Security headers validation
export const validateSecurityHeaders = (req, res, next) => {
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
  
  for (const header in req.headers) {
    const value = req.headers[header];
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          logSecurity('Suspicious header detected', {
            ip: req.ip,
            header,
            value,
            userAgent: req.get('User-Agent')
          });
          return res.status(400).json({ error: 'Підозрілі дані в заголовках' });
        }
      }
    }
  }
  
  next();
};
