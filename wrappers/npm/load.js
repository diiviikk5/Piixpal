/* npm builds: load the Piixpal bundle that ships in this package (no CDN), once,
 * and only in the browser. */
let loading = null;
export function loadPiixpal() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Piixpal && window.Piixpal._k) return Promise.resolve(window.Piixpal);
  if (!loading) loading = import('../../piixpal.min.js').then(() => window.Piixpal);
  return loading;
}
