// Runtime environment for the webapp.
//
// Most values come from Vite's compile-time `import.meta.env` (VITE_* vars
// baked into the bundle). `LEGAL_PROFILE`, however, must be a RUNTIME knob
// so that a single immutable image can be deployed with different legal
// identities. The container entrypoint writes `/env.js` on start, which
// attaches a `window.__APOLLON_ENV__` object referenced below.

interface RuntimeEnv {
  LEGAL_PROFILE?: string
}

declare global {
  interface Window {
    __APOLLON_ENV__?: RuntimeEnv
  }
}

const runtime: RuntimeEnv =
  typeof window !== "undefined" ? (window.__APOLLON_ENV__ ?? {}) : {}

// Dev fallback: Vite's `import.meta.env.VITE_LEGAL_PROFILE` lets you run the
// Vite dev server with a selected profile without shipping a container.
const devProfile =
  (import.meta.env.VITE_LEGAL_PROFILE as string | undefined) ?? ""

export const environment = {
  legal: {
    profile: (runtime.LEGAL_PROFILE ?? devProfile ?? "").trim(),
  },
}
