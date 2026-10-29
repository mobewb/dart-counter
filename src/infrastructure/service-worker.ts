/** Installs the offline service worker in production builds; dev servers skip it. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((error) => console.warn('Offline mode unavailable', error))
  })
}
