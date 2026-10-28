/**
 * Prefix of the browser storage names. The develop build is served from a
 * sub-path of the same site as main, so it is built with its own prefix to
 * keep its own history and preferences.
 */
export const STORAGE_NAME: string = import.meta.env.VITE_STORAGE_NAME || 'dart-counter'
