import { Link } from "@tanstack/react-router"
import { Island, GroupDivider } from "./islandPrimitives"
import { BackNav } from "./BackNav"
import { BrandAndVersion } from "./BrandAndVersion"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { HomeHelpMenu } from "@/components/home/HomeHelpMenu"
import { useBackTarget } from "@/hooks/useBackTarget"

/**
 * Sticky island-language header for the chrome sub-routes (imprint, privacy,
 * 404), replacing the retired `HomeNavbar`. Built from the shared island
 * primitives + `--apollon-chrome-*` tokens so the sub-routes read as the SAME
 * floating-glass grammar as the home band and the editor chrome header.
 *
 * Like `HomeHeaderRow`, this IS the sticky island row itself — the outer rhythm
 * (the `home-content-x` gutter, the 1536px max width, and the `pt-5/md:pt-6`
 * resting offset) is supplied by the shared `PageShell` that wraps it, so the
 * brand island lands at the identical baseline and pins identically whether the
 * user is on the home or a sub-page. Left: the brand banner (logo + version)
 * linking home. Right: an actions island with the shared back affordance, the
 * Help menu, and the theme switcher.
 */
export const ChromeSubHeader = () => {
  const backTarget = useBackTarget()

  return (
    <div className="sticky top-[calc(var(--safe-area-inset-top,0px)+0.75rem)] z-20 flex items-start gap-[var(--apollon-chrome-gap)] pb-2 md:top-[calc(var(--safe-area-inset-top,0px)+1rem)]">
      <Island as="header" role="banner" ariaLabel="Home">
        <Link
          to="/"
          aria-label="Apollon home"
          className="flex shrink-0 items-center rounded-sm text-[color:var(--apollon-chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--apollon-chrome-accent)]"
        >
          <BrandAndVersion />
        </Link>
        <GroupDivider />
        <BackNav
          {...backTarget}
          tone="onDark"
          labelClassName="hidden lg:inline"
        />
      </Island>

      <div className="flex-1" />

      <Island ariaLabel="Page actions">
        <HomeHelpMenu />
        <GroupDivider />
        <ThemeSwitcherMenu />
      </Island>
    </div>
  )
}
