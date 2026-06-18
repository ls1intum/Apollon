import { describe, it, expect, vi, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

// The heavy editor App can't mount in this jsdom unit env (it pulls the full
// component tree), so stub it out: exportModelAsSvg's concern under test is the
// off-screen mount's STYLE lifecycle — inject the layout + Inter CSS so a
// headless consumer needs no style.css, then remove it on EVERY exit path. The
// stub never signals React Flow init, so the export takes its timeout -> reject
// path, which is exactly the non-success teardown the leak fix has to cover.
vi.mock("@/App", () => ({ AppWithProvider: () => null }))

// Sentinel for the layout-CSS half of the injected payload. Vitest returns ""
// for `?inline` CSS, so the real EXPORT_LAYOUT_CSS is empty here — mocking it
// lets the test prove exportModelAsSvg actually concatenates it (the font half
// comes from the un-mocked exportFonts chunk, whose woff2 `?inline` does work).
const LAYOUT_SENTINEL = "/* export-layout-sentinel */ .react-flow__node {}"
vi.mock("@/utils/exportStyles", () => ({ EXPORT_LAYOUT_CSS: LAYOUT_SENTINEL }))

import { ApollonEditor } from "@/apollon-editor"
import { importDiagram } from "@/utils/versionConverter"

const require = createRequire(import.meta.url)
const STYLE = "style[data-apollon-export-styles]"

const model = importDiagram(
  JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        "../../../standalone/webapp/tests/fixtures/class-diagram.json"
      ),
      "utf8"
    )
  )
)

describe("self-contained headless export", () => {
  afterEach(() =>
    document.head.querySelectorAll(STYLE).forEach((el) => el.remove())
  )

  it("injects the export CSS into <head> during export and removes it on exit", async () => {
    expect(document.head.querySelector(STYLE)).toBeNull()

    // Capture the injected <style>'s content the moment it lands in <head>.
    let injected: string | null = null
    const realAppend = document.head.appendChild.bind(document.head)
    const spy = vi.spyOn(document.head, "appendChild").mockImplementation(((
      node: Node
    ) => {
      if (node instanceof HTMLStyleElement && node.matches(STYLE)) {
        injected = node.textContent
      }
      return realAppend(node as never)
    }) as typeof document.head.appendChild)

    // Takes the ~3 s React-Flow-init timeout then rejects (stubbed App never
    // inits) — the throw path whose cleanup the fix guards.
    await ApollonEditor.exportModelAsSvg(model, { svgMode: "compat" }).catch(
      () => {}
    )
    spy.mockRestore()

    // Both halves of the payload are concatenated and injected: the layout CSS
    // (sentinel, mocked above) and the Inter @font-face (real exportFonts chunk).
    // Dropping either from exportModelAsSvg fails one of these; reverting the
    // injection makes `injected` null.
    expect(injected).toContain(LAYOUT_SENTINEL)
    expect(injected).toContain("@font-face")
    // Dropping the `finally` cleanup leaves a <style> behind — caught here.
    expect(document.head.querySelector(STYLE)).toBeNull()
  }, 10_000)
})

// Cheap, env-robust source guards for the two ways this fix silently rots.
describe("self-contained headless export — source invariants", () => {
  it("React Flow base.css still carries the load-bearing node-positioning rule", () => {
    // Without `.react-flow__node { position: absolute }` the inline handle `%`
    // offsets resolve against a zero-size box and edges route through nodes.
    // A React Flow upgrade that drops/renames this must fail here loudly.
    const baseCss = readFileSync(
      require.resolve("@xyflow/react/dist/base.css"),
      "utf8"
    )
    expect(baseCss).toMatch(/\.react-flow__node\s*\{[^}]*position:\s*absolute/s)
  })

  it("app.css stays font/asset-free so it can't bloat the export chunk", () => {
    // app.css is inlined verbatim into the lazy export chunk; an `@font-face`
    // or `url(...)` here would drag font/asset bytes into it (fonts ship
    // separately via fonts.css / exportFonts.ts).
    const appCss = readFileSync(
      join(import.meta.dirname, "../../lib/styles/app.css"),
      "utf8"
    )
    // Strip comments first — the guard comment itself mentions `url(...)`.
    const rules = appCss.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(rules).not.toMatch(/@font-face/i)
    expect(rules).not.toMatch(/\burl\(/i)
    expect(rules).not.toMatch(/@import/i)
  })
})
