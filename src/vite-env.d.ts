/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Prefix of the browser storage names; see infrastructure/storage-name.ts. */
  readonly VITE_STORAGE_NAME?: string
}
