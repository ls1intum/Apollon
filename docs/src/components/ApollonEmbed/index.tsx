import { Apollon } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

/**
 * The live editor on the docs homepage. Wrap in `<BrowserOnly>` at the call
 * site — the editor touches `window` and would crash Docusaurus's SSR
 * pre-render. Sizing comes from `.apollon-embed-frame` (src/css/custom.css).
 */
export default function ApollonEmbed() {
  return <Apollon className="apollon-embed-frame" />
}
