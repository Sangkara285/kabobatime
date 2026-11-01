export function publicOrder(order) {
  const allowed = [
    'code', 'status', 'items', 'total', 'payment', 'mode', 'createdAt',
    'completedAt', 'acceptedAt', 'readyAt', 'shippedAt', 'courierName',
    'subtotal', 'discount', 'fee', 'distanceKm', 'paymentStatus', 'paymentNote',
    'proofAt', 'hasProof', 'cashAmount',
  ];
  const visible = Object.fromEntries(allowed.filter((key) => Object.hasOwn(order, key)).map((key) => [key, order[key]]));
  visible.name = String(order.name || '').trim().split(/\s+/)[0] || '';
  return visible;
}
