import { Capacitor } from "@capacitor/core"
import { Link, useLocation } from "@tanstack/react-router"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { HomeHelpMenu } from "@/components/home/HomeFooter"
import { useBackTarget } from "@/hooks/useBackTarget"
import { BackNav } from "./BackNav"
import { BrandAndVersion } from "./BrandAndVersion"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_DROP_SHADOW, NAVBAR_MIN_HEIGHT } from "./styleConstants"

export const HomeNavbar = () => {
  // Web desktop shows the help/legal links in the footer; mobile web and the
  // native (Capacitor) app — where a persistent footer is out of place — get
  // them from this overflow menu instead.
  const isNative = Capacitor.isNativePlatform()
  // On sub-pages (legal, 404) the logo alone isn't an obvious way out, so show
  // the shared back affordance — which returns to the originating diagram when
  // we have provenance, otherwise to the dashboard.
  const isSubPage = useLocation().pathname !== "/"
  const backTarget = useBackTarget()

  return (
    <header
      className="home-navbar sticky top-0 z-40 transition-colors duration-200"
      style={{
        minHeight: NAVBAR_MIN_HEIGHT,
        // Frosted glass: a translucent slate plate over a backdrop blur so
        // content scrolls softly beneath it (a modern dashboard idiom). The
        // 88% mix keeps white brand/controls fully legible even over a light
        // page; browsers without backdrop-filter just see the near-solid plate.
        backgroundColor: `color-mix(in srgb, ${NAVBAR_BACKGROUND_COLOR} 88%, transparent)`,
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      {/* min-height from NAVBAR_MIN_HEIGHT (single source of truth) keeps the
          home bar the same height as the editor navbars (#769's unified header). */}
      <div
        className="home-navbar__content flex w-full items-center gap-3 px-4"
        style={{ minHeight: NAVBAR_MIN_HEIGHT }}
      >
        <Link
          to="/"
          aria-label="Apollon home"
          className="flex shrink-0 items-center rounded-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BrandAndVersion />
        </Link>

        {isSubPage && <BackNav {...backTarget} tone="onDark" />}

        <div className="flex-1" />

        <div className="flex items-center gap-1 px-2">
          <HomeHelpMenu className={isNative ? undefined : "md:hidden"} />
          <ThemeSwitcherMenu />
        </div>
      </div>
    </header>
  )
}
