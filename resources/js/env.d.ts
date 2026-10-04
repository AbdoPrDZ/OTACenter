/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_URL: string;
    /** Set to "true" to force request/response console logging outside dev. */
    readonly VITE_APP_DEBUG?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
