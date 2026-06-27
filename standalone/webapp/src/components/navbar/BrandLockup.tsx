import { appVersion } from "@/constants"
import TumLogo from "assets/images/tum-logo-579x579.png"

/**
 * Brand lockup: TUM logo + "APOLLON" wordmark. The version string is shown only in
 * the `title` tooltip and Help → About, keeping the brand island uncluttered.
 */
export const BrandLockup = () => {
  return (
    // Logo + wordmark are one indivisible unit: never shrink, wrap, or truncate
    // (no "Apol…" on narrow viewports).
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
      {/* The wordmark hides below 480px (logo-only) so on a super-narrow phone the
          brand never crowds out the back affordance beside it. */}
      <span className="hidden overflow-visible pr-1 text-base leading-none font-semibold tracking-[0.06em] whitespace-nowrap text-[color:var(--apollon-chrome-text)] uppercase min-[480px]:inline">
        Apollon
      </span>
    </div>
  )
}
