// Intentionally empty. Platform detection now lives in src/utils/platform.ts
// (a tiny user-agent helper); under jsdom its UA is neither iOS nor Android, so
// the export hooks naturally take the browser-download branch with no mocking.
export {}
