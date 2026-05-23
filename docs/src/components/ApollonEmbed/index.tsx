import {
  Apollon,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon/react"
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
 */
export default function ApollonEmbed() {
  return (
    <Apollon
      type={UMLDiagramType.ClassDiagram}
      mode={ApollonMode.Modelling}
      locale={Locale.en}
      className="apollon-embed-frame"
    />
  )
}
