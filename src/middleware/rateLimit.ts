// Rate limiting middleware to prevent SP manipulation attacks
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Rate limit configuration per endpoint
const RATE_LIMITS = {
  '/api/unclaimed-rewards': { requests: 10, windowMs: 60000 }, // 10 requests per minute
  '/api/complete-task': { requests: 20, windowMs: 60000 }, // 20 requests per minute  
  '/api/claim-rewards': { requests: 5, windowMs: 60000 }, // 5 requests per minute
  '/api/referrals': { requests: 15, windowMs: 60000 }, // 15 requests per minute
  '/api/auth/login': { requests: 100, windowMs: 60000 }, // ✅ 100 login attempts per minute (testing)
  '/api/auth/signup': { requests: 100, windowMs: 60000 }, // ✅ 100 signup attempts per minute (testing)
  default: { requests: 30, windowMs: 60000 } // 30 requests per minute for other APIs
};

export function rateLimit(request: NextRequest): NextResponse | null {
  const clientIP = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';
    
  const pathname = new URL(request.url).pathname;
  
  // Get rate limit config for this endpoint
  const config = (RATE_LIMITS as Record<string, { requests: number; windowMs: number }>)[pathname] || RATE_LIMITS.default;
  const key = `${clientIP}:${pathname}`;
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up old entries
  if (rateLimitStore[key] && rateLimitStore[key].resetTime < windowStart) {
    delete rateLimitStore[key];
  }
  
  // Initialize or update rate limit data
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs
    };
  } else {
    rateLimitStore[key].count++;
  }
  
  // Check if rate limit exceeded
  if (rateLimitStore[key].count > config.requests) {
    
    // Log suspicious activity
    console.warn(`🚨 RATE LIMIT EXCEEDED`, {
      clientIP,
      pathname,
      attempts: rateLimitStore[key].count,
      limit: config.requests,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    });
    
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Too many requests.',
        retryAfter: Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitStore[key].resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': config.requests.toString(),
          'X-RateLimit-Remaining': Math.max(0, config.requests - rateLimitStore[key].count).toString(),
          'X-RateLimit-Reset': rateLimitStore[key].resetTime.toString()
        }
      }
    );
  }
  
  return null; // No rate limit hit, continue
}

// Cleanup function to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 300000); // Clean up every 5 minutes
