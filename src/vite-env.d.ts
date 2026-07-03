/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL cua API Worker; de trong neu FE va API cung origin (hoac dung vite proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
