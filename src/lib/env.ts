const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, '');

/** The only place that reads import.meta.env, so defaults live in one spot. */
export const env = {
  /** Same-origin by default; Vite's dev proxy forwards /api to the API server. */
  apiBaseUrl,
  /** true when the API is on another origin than this page, so the browser enforces CORS on every call. */
  isApiCrossOrigin: (): boolean =>
    new URL(apiBaseUrl, window.location.origin).origin !== window.location.origin,
} as const;
