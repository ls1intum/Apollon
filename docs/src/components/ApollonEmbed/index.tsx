import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

/**
 * Live Apollon editor mounted inside the docs site.
 *
 * Uses the `<Apollon>` React component from the `@tumaet/apollon/react`
 * subpath — the editor shares the docs site's own React copy instead of
 * bundling a second one. The `.apollon-embed-frame` class supplies the
 * frame's size and light background (see src/css/custom.css).
 *
 * Wrap in `<BrowserOnly>` at the call site: the editor touches `window`,
 * which would crash Docusaurus's SSR pre-render pass.
 *
 * No props beyond the class name: every editor option (`type`, `mode`,
 * `locale`) defaults to the values shown here, so the explicit overrides
 * were noise.
 */
export default function ApollonEmbed() {
  return <Apollon className="apollon-embed-frame" />
}
