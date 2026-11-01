export function publicOrder(order) {
  const safe = { ...order };
  for (const key of ['phone', 'address', 'lat', 'lng', 'courierId', 'proofUrl', 'note']) delete safe[key];
  return {
    ...safe,
    name: String(order.name || '').trim().split(/\s+/)[0] || '',
  };
}
