import { Capacitor } from "@capacitor/core"
import { Link, useLocation } from "react-router"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { HomeHelpMenu } from "@/components/home/HomeFooter"
import { useBackTarget } from "@/hooks/useBackTarget"
import { BackNav } from "./BackNav"
import { BrandAndVersion } from "./BrandAndVersion"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_DROP_SHADOW } from "./styleConstants"

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
        backgroundColor: NAVBAR_BACKGROUND_COLOR,
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      <div className="home-navbar__content flex min-h-[64px] w-full items-center gap-3 px-4">
        <Link
          to="/"
          aria-label="Apollon home"
          className="flex shrink-0 items-center rounded-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BrandAndVersion />
        </Link>

        {isSubPage && (
          <BackNav to={backTarget.to} label={backTarget.label} tone="onDark" />
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1 px-2">
          <HomeHelpMenu className={isNative ? undefined : "md:hidden"} />
          <ThemeSwitcherMenu />
        </div>
      </div>
    </header>
  )
}
