/**
 * Asks the browser not to evict our storage under pressure (Safari otherwise
 * clears it after 7 days without a visit). Best effort: the answer is ignored.
 */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {})
}
