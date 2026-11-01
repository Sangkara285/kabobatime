// Perhitungan jarak dan ongkir. Jarak di bawah 1 km gratis; selain itu ongkir = ceil(km) x tarif per km.
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Jarak jalan via OSRM (gratis). Gagal/timeout -> garis lurus x 1,3.
export async function distanceKm(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (res.ok) {
      const j = await res.json();
      const m = j?.routes?.[0]?.distance;
      if (Number.isFinite(m) && m >= 0) return { km: m / 1000, source: 'osrm' };
    }
  } catch (e) { /* fallback */ }
  return { km: haversineKm(from, to) * 1.3, source: 'haversine' };
}

export async function quote(settings, point, subtotal = 0) {
  const lat = Number(point?.lat), lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: 'Lokasi antar belum dipilih.' };
  const { km, source } = await distanceKm({ lat: settings.outlet_lat, lng: settings.outlet_lng }, { lat, lng });
  const km2 = Math.round(km * 100) / 100;
  const billedKm = Math.max(1, Math.ceil(km - 1e-9));
  const withinRange = km <= settings.max_km;
  const free = km < 1 || (settings.free_above > 0 && subtotal >= settings.free_above);
  return { ok: true, km: km2, billedKm, source, withinRange, fee: free ? 0 : billedKm * settings.fee_per_km, free, perKm: settings.fee_per_km, maxKm: settings.max_km };
}
