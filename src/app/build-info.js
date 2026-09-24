// Build info injected by Vite at compile time (see vite.config.js `define`).
// Falls back to safe defaults when the bundle hasn't been built (e.g. running
// utils-only tests with raw source).
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : null;
// Short build label: "v1.1 · 12 may" — small, low-contrast, lives in the
// header so the user can tell at a glance whether the update they just
// deployed is the one they're seeing.
export const buildLabel = () => {
  const v = APP_VERSION.replace(/^v?/, '').replace(/\.0+$/, ''); // 1.1.0 → 1.1, 1.1.3 → 1.1.3
  if (!BUILD_DATE) return `v${v}`;
  const d = new Date(BUILD_DATE);
  const day = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\.$/, '');
  return `v${v} · ${day}`;
};
