import type { ApollonEditor } from "@tumaet/apollon/react"

// `__perf` is an internal dev probe stripped from the published `.d.ts`
// (@internal + stripInternal), so it isn't on the public `ApollonEditor` type.
// This E2E-only seam reaches it structurally; the runtime body is itself
// DEV-gated, so production gets only an empty stub.
type PerfProbe = { __perf: () => Record<string, number> | undefined }

type PerfHookWindow = Window & {
  __apollonPerf?: () => Record<string, number> | undefined
}

/**
 * E2E-only seam: expose the editor's dev performance probe as
 * `window.__apollonPerf()` so the Playwright `tests/perf/` suite can read
 * the Yjs document size / store-write count without a UI affordance.
 *
 * Double-gated so it stays free in production: the probe itself is
 * dead-code-eliminated from the library build under `import.meta.env.DEV`, and
 * exposure here additionally requires the opt-in `?perfHooks` URL param (the
 * value is ignored — presence is the gate), mirroring the existing test
 * URL-param gates. Returns a cleanup that removes the global. A no-op
 * (returning a no-op cleanup) unless both gates pass.
 */
export const installPerfHooks = (editor: ApollonEditor): (() => void) => {
  if (!import.meta.env.DEV) return () => {}
  if (!new URLSearchParams(window.location.search).has("perfHooks")) {
    return () => {}
  }

  const w = window as PerfHookWindow
  const probe = editor as unknown as PerfProbe
  w.__apollonPerf = () => probe.__perf()

  return () => {
    delete w.__apollonPerf
  }
}
