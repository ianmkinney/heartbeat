import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Store for tracking API calls
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}, 15 * 60 * 1000);

// Rate limits for different API endpoints
const RATE_LIMITS: { [key: string]: number } = {
  // General API rate limit (requests per minute)
  default: 120,
  // Special limits for specific endpoints
  '/api/analyze': 5,    // 5 requests per minute
  '/api/claude': 10,    // 10 requests per minute
  '/api/survey': 1,     // 1 request per second
};

// Endpoint-specific window time (in milliseconds)
const WINDOW_TIME: { [key: string]: number } = {
  default: 60 * 1000,         // 1 minute
  '/api/analyze': 60 * 1000,  // 1 minute
  '/api/claude': 60 * 1000,   // 1 minute
  '/api/survey': 1000,        // 1 second
};

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Create a key based on IP + pathname
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown-ip';
  const path = request.nextUrl.pathname;
  
  // Find the most specific matching path prefix
  let matchedPath = 'default';
  let maxPrefixLength = 0;
  
  for (const prefix of Object.keys(RATE_LIMITS)) {
    if (prefix !== 'default' && path.startsWith(prefix) && prefix.length > maxPrefixLength) {
      matchedPath = prefix;
      maxPrefixLength = prefix.length;
    }
  }

  // Get the rate limit and window time for this endpoint
  const rateLimit = RATE_LIMITS[matchedPath];
  const windowMs = WINDOW_TIME[matchedPath];
  
  // Create a unique key for this IP + endpoint
  const key = `${ip}:${matchedPath}`;
  const now = Date.now();

  // Initialize or reset the rate limit entry if it has expired
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment the counter
  rateLimitStore[key].count++;

  // Add rate limit headers to response
  const remaining = Math.max(0, rateLimit - rateLimitStore[key].count);
  const resetTime = rateLimitStore[key].resetTime;
  
  const response = NextResponse.next();
  
  response.headers.set('X-RateLimit-Limit', rateLimit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());

  // If limit exceeded, return 429 Too Many Requests
  if (rateLimitStore[key].count > rateLimit) {
    return new NextResponse(
      JSON.stringify({ 
        error: `Rate limit exceeded. Try again in ${Math.ceil((resetTime - now) / 1000)} seconds.` 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          'Retry-After': Math.ceil((resetTime - now) / 1000).toString(),
        },
      }
    );
  }

  return response;
}

// Apply middleware to all API routes
export const config = {
  matcher: '/api/:path*',
}; 