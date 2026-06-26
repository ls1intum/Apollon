import { Link } from "@tanstack/react-router"
import { TooltipProvider } from "@tumaet/ui/components/tooltip"
import { Island, GroupDivider } from "./islandPrimitives"
import { BackNav } from "./BackNav"
import { BrandLockup } from "./BrandLockup"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { HomeHelpMenu } from "@/components/home/HomeHelpMenu"
import { useBackTarget } from "@/hooks/useBackTarget"

/**
 * Sticky island-language header for the chrome sub-routes (imprint, privacy, 404),
 * built from the shared island primitives + `--apollon-chrome-*` tokens so the
 * sub-routes read as the same floating-glass grammar as the home band and editor.
 *
 * Like `HomeHeaderRow`, this IS the sticky island row itself — the outer rhythm
 * (gutter, max width, resting offset) is supplied by the shared `PageShell` that
 * wraps it, so the brand island pins identically whether on home or a sub-page.
 * Left: the brand banner (logo) linking home + the shared back affordance. Right:
 * an actions island with the Help menu and the theme switcher. The page's single
 * `<h1>` lives in the page content, not the band.
 */
export const ChromeSubHeader = () => {
  const backTarget = useBackTarget()

  return (
    <TooltipProvider>
      <div className="sticky top-[calc(var(--safe-area-inset-top,0px)_+_0.75rem)] z-20 flex items-start gap-[var(--apollon-chrome-gap)] pb-2 md:top-[calc(var(--safe-area-inset-top,0px)_+_1rem)]">
        <Island as="header" role="banner" ariaLabel="Home">
          <Link
            to="/"
            aria-label="Apollon home"
            className="flex shrink-0 items-center rounded-sm text-[color:var(--apollon-chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--apollon-chrome-accent)]"
          >
            <BrandLockup />
          </Link>
          <GroupDivider />
          {/* The "All diagrams" label stays down to 360px — below 480px the brand
            collapses to logo-only (see BrandLockup), freeing room for it. Falls
            back to a bare chevron only under 360px. */}
          <BackNav
            {...backTarget}
            tone="onDark"
            labelClassName="hidden min-[360px]:inline"
          />
        </Island>

        <div className="flex-1" />

        {/* {Help, Theme} at every width — both controls always fit, so Help stays
          its own dropdown (icon-only below lg, labelled at lg+) and Theme a 1-tap
          toggle. No "…" overflow: it would hide Theme behind two taps for no space
          saving. Matches the editor/home actions islands. */}
        <Island ariaLabel="Page actions">
          <HomeHelpMenu reveal="lg" />
          <ThemeSwitcherMenu />
        </Island>
      </div>
    </TooltipProvider>
  )
}
