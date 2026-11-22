/**
 * Prefix of the browser storage names. Builds served from a sub-path of the
 * same site as main (develop, previews) are built with their own prefix to
 * keep their own history and preferences.
 */
export const STORAGE_NAME: string = import.meta.env.VITE_STORAGE_NAME || 'dart-counter'
