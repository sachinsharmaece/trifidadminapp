// ARCHITECTURE.md §10.2 — the full variable list for this repository.
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  appName: import.meta.env.VITE_APP_NAME ?? 'TriFid Desks',
  isDevelopment: import.meta.env.VITE_ENV !== 'production',
  // Client-walkthrough scaffolding, off by default. See lib/devNotes.ts.
  showDevNotes: import.meta.env.VITE_SHOW_DEV_NOTES === 'true',
};
