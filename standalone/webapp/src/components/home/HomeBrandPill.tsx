import { appVersion } from "@/constants"
import TumLogo from "assets/images/tum-logo-579x579.png"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"

/**
 * Mobile brand pill (< md) with HOME semantics: the home has no "back", so this
 * is the brand MARK only (TUM logo, no wordmark — on a phone the wordmark is
 * noise that crowds the controls),
 * wrapped as the single `<header role="banner">` so the home keeps one banner
 * landmark.
 *
 * It reuses `ISLAND_LAYOUT_STYLE` + `.apollon-glass` so it is the same material
 * and height budget as every other island/pill.
 */
export function HomeBrandPill() {
  return (
    <header
      role="banner"
      aria-label="Home"
      className="apollon-glass apollon-chrome-island"
      style={ISLAND_LAYOUT_STYLE}
      title={`Apollon ${appVersion}`}
    >
      <img
        alt="Apollon home"
        src={TumLogo}
        width="28"
        height="28"
        className="block shrink-0"
      />
    </header>
  )
}
