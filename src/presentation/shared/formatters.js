export const dateKey = d => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
export const formatLong = d => new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const formatShort = d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export const formatTime = d => new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
export const fmtDur = s => {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};
export const parseDur = str => {
  if (typeof str === 'number') return Math.max(0, Math.round(str));
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }
  // No colon: digit-only string interpreted as compact MMSS / HMMSS / HHMMSS
  // e.g. "30" → 0:30, "230" → 2:30, "0230" → 2:30, "1200" → 12:00, "12345" → 1:23:45
  const digits = s.replace(/\D/g, '');
  if (!digits) return 0;
  if (digits.length <= 2) return parseInt(digits, 10);
  const ss = parseInt(digits.slice(-2), 10);
  if (digits.length <= 4) {
    const mm = parseInt(digits.slice(0, -2), 10);
    return mm * 60 + ss;
  }
  const mm = parseInt(digits.slice(-4, -2), 10);
  const hh = parseInt(digits.slice(0, -4), 10);
  return hh * 3600 + mm * 60 + ss;
};
export const sessionDuration = ses => ses.duration || (ses.entries?.reduce((a, e) =>
  a + e.sets.reduce((b, s) => b + (s.duration || 0), 0), 0) || 0);
