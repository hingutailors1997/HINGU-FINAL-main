/**
 * Security Middleware Configuration
 * Provides security headers (Helmet-lite), MongoDB injection defense, XSS protection, and Rate Limiting
 */

// Basic security headers to prevent framing, MIME sniffing, and XSS vulnerabilities
const securityHeaders = (req, res, next) => {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
};

// Recursively sanitize objects to strip MongoDB operator injection ($ or . in keys)
const sanitizeObject = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Remove keys starting with $ or containing . (except standard decimals)
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          // Basic XSS escaping for dangerous script tags
          if (obj[key].includes('<script>') || obj[key].includes('javascript:')) {
            obj[key] = obj[key].replace(/<script>/gi, '').replace(/javascript:/gi, '');
          }
        }
      }
    }
  }
};

const mongoInjectionProtection = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

// Simple In-Memory Rate Limiting (Protects endpoints against DoS floods)
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300;    // 300 requests per minute per IP

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return next();
  }

  const record = rateLimitMap.get(ip);
  if (now - record.firstRequest > WINDOW_MS) {
    record.count = 1;
    record.firstRequest = now;
    return next();
  }

  record.count++;
  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please try again after a minute.',
      error: { code: 'RATE_LIMIT_EXCEEDED' }
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  mongoInjectionProtection,
  rateLimiter
};
