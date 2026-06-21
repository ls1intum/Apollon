import { appVersion } from "@/constants"
import TumLogo from "assets/images/tum-logo-579x579.png"

/**
 * Brand lockup: TUM logo + "APOLLON" wordmark. The version string is NOT shown
 * here, so the brand island stays uncluttered and leaves room for controls; the
 * version is discoverable via Help → About and the `title` tooltip below. The
 * logo is a compact ~28px so the brand island stays the same height as its
 * sibling islands.
 */
export const BrandAndVersion = () => {
  return (
    // Logo + wordmark are one indivisible unit: never shrink, never wrap, never
    // truncate (no "Apol…" on narrow viewports). The version string lives in the
    // `title` tooltip (and Help → About), keeping the brand island uncluttered.
    <div
      title={`Apollon ${appVersion}`}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
    >
      <img
        alt="TUM logo"
        src={TumLogo}
        width="28"
        height="28"
        className="block shrink-0"
      />
      <span className="overflow-visible whitespace-nowrap font-[family-name:var(--navbar-app-name-font)] text-base leading-none font-semibold tracking-[0.06em] text-[color:var(--apollon-chrome-text)] uppercase">
        Apollon
      </span>
    </div>
  )
}
