export function createRateLimiter(maxBuckets = 10000) {
  const buckets = new Map();

  return (key, { limit, windowMs, now = Date.now() }) => {
    const bucketKey = String(key || 'unknown');
    let bucket = buckets.get(bucketKey);

    if (!bucket || now >= bucket.expiresAt) {
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
    bucket.count += 1;
    return { allowed: true, retryAfter: 0 };
  };
}
