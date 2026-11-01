export function createRateLimiter(maxBuckets = 10000) {
  const buckets = new Map();

  const inspect = (key, { limit, windowMs, now = Date.now() }, consume) => {
    const bucketKey = String(key || 'unknown');
    let bucket = buckets.get(bucketKey);

    if (!bucket || now >= bucket.expiresAt) {
      if (!consume) return { allowed: true, retryAfter: 0 };
      if (buckets.size >= maxBuckets) {
        for (const [candidate, value] of buckets) {
          if (now >= value.expiresAt) buckets.delete(candidate);
        }
        if (buckets.size >= maxBuckets) return { allowed: false, retryAfter: 60 };
      }
      bucket = { count: 1, expiresAt: now + windowMs };
      buckets.set(bucketKey, bucket);
      return { allowed: true, retryAfter: 0 };
    }

    if (bucket.count >= limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)) };
    }
    if (consume) bucket.count += 1;
    return { allowed: true, retryAfter: 0 };
  };
  const consume = (key, options) => inspect(key, options, true);
  consume.peek = (key, options) => inspect(key, options, false);
  consume.reset = (key) => buckets.delete(String(key || 'unknown'));
  return consume;
}
