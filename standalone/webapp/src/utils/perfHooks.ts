import type { ApollonEditor } from "@tumaet/apollon"

// `__perf` is an internal dev probe stripped from the published `.d.ts`
// (@internal + stripInternal), so it isn't on the public `ApollonEditor` type.
// This E2E-only seam reaches it structurally; the runtime body is itself
// DEV-gated, so production gets only an empty stub.
type PerfProbe = {
  __perf: (skipDocumentEncoding?: boolean) => Record<string, number> | undefined
}

type PerfHookWindow = Window & {
  __apollonPerf?: (
    skipDocumentEncoding?: boolean
  ) => Record<string, number> | undefined
}

/**
 * E2E-only seam: expose the editor's dev performance probe as
 * `window.__apollonPerf()` so the Playwright `tests/perf/` suite can read
 * the Yjs document size / store-write count without a UI affordance.
 *
 * Double-gated so it stays free in production: the build gate keeps it out of
 * the shipped bundle (DEV, or the dedicated e2e build — both statically false in
 * a real production build, so this dead-code-eliminates), and exposure here
 * additionally requires the opt-in `?perfHooks` URL param (the value is ignored —
 * presence is the gate), mirroring the existing test URL-param gates. Returns a
 * cleanup that removes the global. A no-op (returning a no-op cleanup) unless
 * both gates pass.
 */
export const installPerfHooks = (editor: ApollonEditor): (() => void) => {
  if (!(import.meta.env.DEV || import.meta.env.VITE_E2E === "true"))
    return () => {}
  if (!new URLSearchParams(window.location.search).has("perfHooks")) {
    return () => {}
  }

  const w = window as PerfHookWindow
  const probe = editor as unknown as PerfProbe
  w.__apollonPerf = (skipDocumentEncoding) => probe.__perf(skipDocumentEncoding)

  return () => {
    delete w.__apollonPerf
  }
}
