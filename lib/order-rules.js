export function trackingExpired(status, completedAtEpoch, nowEpoch, expiryMinutes) {
  if (completedAtEpoch === null || completedAtEpoch === undefined || nowEpoch === null || nowEpoch === undefined) return false;
  const completed = Number(completedAtEpoch);
  const now = Number(nowEpoch);
  return status === 'selesai'
    && Number.isFinite(completed)
    && Number.isFinite(now)
    && completed < now - expiryMinutes * 60;
}

export function sellerStatusError(mode, status) {
  if (status === 'diantar') {
    return { status: 400, message: 'Status Sedang diantar hanya dapat diubah oleh kurir.' };
  }
  if (status === 'selesai' && mode === 'antar') {
    return { status: 409, message: 'Pesanan antar diselesaikan oleh kurir.' };
  }
  return null;
}

export function courierAssignmentError(status) {
  return status === 'baru'
    ? { status: 400, message: 'Terima pesanan dulu sebelum menugaskan kurir.' }
    : null;
}

export function cashAmountError(payment, cashAmount, total) {
  if (payment !== 'Tunai' && cashAmount !== null) {
    return 'Uang yang disiapkan hanya berlaku untuk pembayaran Tunai.';
  }
  if (payment === 'Tunai' && cashAmount !== null
    && (!Number.isSafeInteger(cashAmount) || cashAmount < total || (cashAmount !== total && cashAmount > 10000000))) {
    return `Uang tunai harus berupa angka bulat minimal ${total} dan maksimal 10000000.`;
  }
  return null;
}

export function courierIsActive(courier) {
  return Number(courier?.active) === 1;
}
