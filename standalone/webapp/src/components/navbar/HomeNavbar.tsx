import { NAVBAR_BACKGROUND_COLOR } from "@/constants/colorPlate"
import { appVersion } from "@/constants/version"
import TumLogo from "assets/images/tum-logo.png"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"

export const HomeNavbar = () => {
  return (
    <header
      className="sticky top-0 z-40 flex min-h-[64px] items-center border-b border-[var(--home-border-color)] px-4 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-colors duration-200"
      style={{ backgroundColor: NAVBAR_BACKGROUND_COLOR }}
    >
      <div className="flex min-w-0 items-center overflow-hidden md:w-20 lg:w-56">
        <img
          alt="TU Munich logo"
          src={TumLogo}
          width="60"
          height="30"
          className="mr-2.5 shrink-0"
        />
        <div className="hidden min-w-0 items-center lg:flex">
          <span className="mr-2 truncate text-2xl font-bold text-white">
            Apollon
          </span>
          <span className="text-sm text-[#A3A6A8]">{appVersion}</span>
        </div>
      </div>

      <div className="flex-1" />
      <div className="px-2">
        <ThemeSwitcherMenu />
      </div>
    </header>
  )
}
