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
 * linking home + the shared back affordance. Center: the page TITLE in a quiet
 * title island, mirroring the editor's `[brand/back][title][actions]` band and
 * the home's `[brand][search][actions]` — so the sub-page reads as the same
 * three-region band instead of a brand/actions pair with a vast empty centre.
 * Right: an actions island with the Help menu and the theme switcher.
 *
 * The title island carries the page's SINGLE `<h1>` (persistently visible while
 * long legal copy scrolls), so `LegalPage` / `ErrorPage` render no content `<h1>`
 * of their own — exactly one `<h1>` per page, in the sticky band.
 */
export const ChromeSubHeader = ({ title }: { title: string }) => {
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

      {/* CENTER: the page title as a centered chip — a content-sized title
          island (NOT the full-width search-field look) centred in the track, so
          the band reads as a clean three-region masthead with the title in the
          middle and symmetric whitespace, instead of an empty search box or a
          one-sided void. Truncates if a title is ever long enough to crowd. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <Island ariaLabel="Page">
          <h1
            className="truncate text-sm font-semibold"
            style={{ color: "var(--apollon-chrome-text)" }}
          >
            {title}
          </h1>
        </Island>
      </div>

      <Island ariaLabel="Page actions">
        <HomeHelpMenu />
        <GroupDivider />
        <ThemeSwitcherMenu />
      </Island>
    </div>
  )
}
