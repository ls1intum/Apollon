import { Capacitor } from "@capacitor/core"
import { Link } from "react-router"
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

  return (
    <header
      className="sticky top-0 z-40 flex min-h-[64px] items-center px-4 transition-colors duration-200"
      style={{
        backgroundColor: NAVBAR_BACKGROUND_COLOR,
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      <Link
        to="/"
        aria-label="All diagrams"
        className="flex shrink-0 items-center rounded-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <BrandAndVersion />
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-1 px-2">
        <HomeHelpMenu className={isNative ? undefined : "md:hidden"} />
        <ThemeSwitcherMenu />
      </div>
    </header>
  )
}
