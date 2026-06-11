import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { BrandAndVersion } from "./BrandAndVersion"
import { NavbarHelp } from "./NavbarHelp"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_DROP_SHADOW } from "./styleConstants"

export const HomeNavbar = () => {
  return (
    <header
      className="sticky top-0 z-40 flex min-h-[64px] items-center px-4 transition-colors duration-200"
      style={{
        backgroundColor: NAVBAR_BACKGROUND_COLOR,
        boxShadow: NAVBAR_DROP_SHADOW,
      }}
    >
      <div className="flex shrink-0 items-center text-white">
        <BrandAndVersion />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 px-2">
        <NavbarHelp />
        <ThemeSwitcherMenu />
      </div>
    </header>
  )
}
