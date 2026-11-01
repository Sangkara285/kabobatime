'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (color, glyph) =>
  L.divIcon({
    className: '',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center"><span style="transform:rotate(45deg);color:#fff;font:700 14px system-ui">${glyph}</span></div>`,
  });

// Pelanggan menentukan titik antar: ketuk peta, geser pin, atau "Pakai lokasi saya".
export default function LocationPicker({ value, onChange, outlet }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const cb = useRef(onChange);
  const [msg, setMsg] = useState('');
  cb.current = onChange;

  useEffect(() => {
    if (!box.current || map.current) return undefined;
    const m = L.map(box.current, { center: [outlet.lat, outlet.lng], zoom: 14, zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    L.marker([outlet.lat, outlet.lng], { icon: pin('#2A1B12', 'K'), interactive: false, keyboard: false }).addTo(m);
    m.on('click', (e) => cb.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 100);
    return () => { m.remove(); map.current = null; marker.current = null; };
  }, [outlet.lat, outlet.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m || !value) return;
    if (!marker.current) {
      marker.current = L.marker([value.lat, value.lng], { icon: pin('#D9680F', '•'), draggable: true }).addTo(m);
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); cb.current({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }); });
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  function locate() {
    setMsg('');
    if (!navigator.geolocation) { setMsg('Browser ini tidak bisa membaca lokasi. Ketuk peta untuk memilih titik antar.'); return; }
    setMsg('Mencari lokasimu…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
        cb.current(v);
        map.current?.setView([v.lat, v.lng], 16);
        setMsg('');
      },
      () => setMsg('Lokasi tidak bisa dibaca (izin ditolak?). Ketuk peta untuk memilih titik antar.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={locate} className="btn btn-ghost btn-sm">Pakai lokasi saya</button>
      <div ref={box} className="z-0 h-64 w-full overflow-hidden rounded-2xl border border-line bg-paper sm:h-72" role="application" aria-label="Peta lokasi antar. Ketuk untuk memilih titik." />
      <p className="text-sm text-ink-2" role="status">{msg || (value ? 'Geser pin oranye bila titiknya kurang tepat.' : 'Ketuk peta di lokasi pengantaran, atau pakai lokasi saya.')}</p>
    </div>
  );
}
