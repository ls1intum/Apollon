import { useLocation } from "@tanstack/react-router"
import { useModalContext } from "@/contexts"
import { readNavFrom } from "@/lib/navProvenance"
import type { HelpMenuVariant } from "./HomeHelpMenu"

/**
 * Container hook for the shared Help/legal menu body ({@link HelpMenuItems}):
 * owns the impure wiring — modal opening and the router-derived legal-link
 * provenance — so the item rendering stays pure.
 *
 * Provenance for the legal links differs by where Help lives:
 *  - editor → this IS the origin, so STAMP the current diagram path as `from`
 *    (so /privacy can offer a real "Back to diagram").
 *  - home / sub-route → this page is itself a hop, so FORWARD the inherited
 *    `from` (an imprint → privacy hop still returns to the diagram, not to
 *    /imprint). `readNavFrom` reads the origin out of the current router state.
 */
export function useHelpMenu(variant: HelpMenuVariant = "home") {
  const { openModal } = useModalContext()
  const location = useLocation()
  const from =
    variant === "editor"
      ? location.pathname + location.searchStr
      : readNavFrom(location.state)
  const legalLinkState = from ? { from } : undefined

  return {
    /** `state={legalLinkState}` for the Imprint/Privacy `<Link>`s. */
    legalLinkState,
    openHowToUse: () => openModal("HowToUseModal"),
    openAbout: () => openModal("AboutModal"),
  }
}
