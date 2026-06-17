import { appVersion } from "@/constants"
import TumLogo from "assets/images/tum-logo-579x579.png"

export const BrandAndVersion = () => {
  return (
    <div className="flex items-center gap-[10px]">
      {/* Logo + wordmark are one indivisible unit: never shrink, never wrap,
          never truncate (no "Apol…" on narrow viewports). */}
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <img
          alt="TUM logo"
          src={TumLogo}
          width="60"
          height="60"
          className="block shrink-0"
        />

        <span className="overflow-visible whitespace-nowrap font-[family-name:var(--navbar-app-name-font)] text-xl leading-none font-semibold tracking-[0.06em] uppercase">
          Apollon
        </span>
      </div>

      {/* Muted text on the always-dark navbar — theme-independent translucent
          white, not a theme-reactive token (the navbar never changes color). */}
      <span className="hidden font-mono text-xs leading-[1.1] tracking-[0.02em] text-white/65 sm:block">
        {appVersion}
      </span>
    </div>
  )
}
