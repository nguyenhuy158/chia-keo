/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base URL cua API Worker; de trong neu FE va API cung origin (hoac dung vite proxy). */
  readonly VITE_API_URL?: string;
  /** Project key cua PostHog; de trong thi khong gui su kien nao. */
  readonly VITE_POSTHOG_KEY?: string;
  /** Host ingest cua PostHog; mac dinh la cloud US. */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
