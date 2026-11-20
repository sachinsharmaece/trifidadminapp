/// <reference types="vite/client" />

// Typed access to the VITE_* variables listed in .env.example.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
