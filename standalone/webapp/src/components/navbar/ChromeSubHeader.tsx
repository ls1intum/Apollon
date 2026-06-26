import { Link } from "@tanstack/react-router"
import { TooltipProvider } from "@tumaet/ui/components/tooltip"
import { Island, GroupDivider } from "./islandPrimitives"
import { BackNav } from "./BackNav"
import { BrandLockup } from "./BrandLockup"
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
export const ChromeSubHeader = () => {
  const backTarget = useBackTarget()

  return (
    <TooltipProvider>
      <div className="sticky top-[calc(var(--safe-area-inset-top,0px)+0.75rem)] z-20 flex items-start gap-[var(--apollon-chrome-gap)] pb-2 md:top-[calc(var(--safe-area-inset-top,0px)+1rem)]">
        <Island as="header" role="banner" ariaLabel="Home">
          <Link
            to="/"
            aria-label="Apollon home"
            className="flex shrink-0 items-center rounded-sm text-[color:var(--apollon-chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--apollon-chrome-accent)]"
          >
            <BrandLockup />
          </Link>
          <GroupDivider />
          {/* The sub-page band has a wide-open centre, so the "All diagrams" label
            stays down to 360px — and below 480px the brand collapses to logo-only
            (see BrandLockup), which frees the room for the label to survive
            that far. It falls back to a bare chevron only under 360px. The page
            title is NOT in the band; it is a real <h1> in the page content. */}
          <BackNav
            {...backTarget}
            tone="onDark"
            labelClassName="hidden min-[360px]:inline"
          />
        </Island>

        <div className="flex-1" />

        {/* The {Help, Theme} cluster at every width — a sub-page has only these
          two controls and there is always room for both, so Help is its own
          dropdown (the real help-circle trigger, icon-only below lg, labelled at
          lg+ via reveal) and Theme stays a 1-tap toggle. No "…" overflow: that
          would hide Theme behind two taps for no space saving. Matches the
          editor/home actions islands. */}
        <Island ariaLabel="Page actions">
          <HomeHelpMenu reveal="lg" />
          <ThemeSwitcherMenu />
        </Island>
      </div>
    </TooltipProvider>
  )
}
