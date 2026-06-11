type RateLimitCache = {
  count: number;
  resetTime: number;
};

const rateLimitMap = new Map<string, RateLimitCache>();

// Simple cleanup interval to prevent memory leaks in long-running processes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60 * 1000); // Clean up every minute
}

export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean } {
  const now = Date.now();
  const cache = rateLimitMap.get(ip);

  if (!cache) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  if (now > cache.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  if (cache.count >= limit) {
    return { success: false };
  }

  cache.count += 1;
  return { success: true };
}
