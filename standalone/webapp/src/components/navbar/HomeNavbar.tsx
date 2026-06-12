import { Capacitor } from "@capacitor/core"
import { Link, useLocation } from "react-router"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { HomeHelpMenu } from "@/components/home/HomeFooter"
import { BrandAndVersion } from "./BrandAndVersion"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_DROP_SHADOW } from "./styleConstants"

export const HomeNavbar = () => {
  // Web desktop shows the help/legal links in the footer; mobile web and the
  // native (Capacitor) app — where a persistent footer is out of place — get
  // them from this overflow menu instead.
  const isNative = Capacitor.isNativePlatform()
  // On sub-pages (legal, 404) the logo alone isn't an obvious way out, so show
  // an explicit "All diagrams" back link.
  const isSubPage = useLocation().pathname !== "/"

  return (
    <header
      className="sticky top-0 z-40 flex min-h-[64px] items-center gap-3 px-4 transition-colors duration-200"
      style={{
        backgroundColor: NAVBAR_BACKGROUND_COLOR,
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      <Link
        to="/"
        aria-label="Apollon home"
        className="flex shrink-0 items-center rounded-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <BrandAndVersion />
      </Link>

      {isSubPage && (
        <Link
          to="/"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All diagrams
        </Link>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1 px-2">
        <HomeHelpMenu className={isNative ? undefined : "md:hidden"} />
        <ThemeSwitcherMenu />
      </div>
    </header>
  )
}
