import { Apollon } from "@tumaet/apollon"
import type { UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
import heroModel from "./heroModel.json"

/**
 * The live editor on the docs homepage. Wrap in `<BrowserOnly>` at the call
 * site — the editor touches `window` and would crash Docusaurus's SSR
 * pre-render. Sizing comes from `.apollon-embed-frame` (src/css/custom.css).
 *
 * Fit on mount: the editor's own load-time fit pins `minZoom: 1.0`, so it can
 * pan but never zoom out, and the hero model clips on narrow embeds.
 */
export default function ApollonEmbed() {
  return (
    <Apollon
      className="apollon-embed-frame"
      // Cast only widens `version` back from `string`; the rest is type-checked.
      defaultModel={heroModel as UMLModel}
      onMount={(editor) => editor.fitView({ duration: 0 })}
    />
  )
}
