import {
  CircleHelpIcon,
  FolderInput,
  SlidersHorizontal,
  Star,
} from "lucide-react"
import { Badge } from "@tumaet/ui/components/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import type { UMLDiagramType } from "@tumaet/apollon"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"
import { ThemeSwitcherMenu } from "@/components/navbar/ThemeSwitcher"
import { MobileMenuButton } from "@/components/navbar/MobileIslands"
import { RefinePopover } from "./RefinePopover"
import { HelpMenuItems } from "./HomeHelpMenu"
import type { HomeChrome } from "./useHomeChrome"

/**
 * Mobile actions pill (< md) with HOME semantics (no Share / Version history).
 * Every control is a DIRECT icon — ★ Favorites · Refine · Import · Help▾ · Theme
 * — in the SAME left-to-right order as the desktop home actions island, so no
 * control jumps position between the desktop band and this pill. Help is its own
 * small dropdown (the shared {@link HelpMenuItems} body) and Theme a direct
 * 1-tap toggle, mirroring the editor mobile pill's Help▾ · Theme tail — no
 * merged "…" overflow on either surface.
 *
 * Every icon-only control wears the shared {@link Tooltip} as its visible name
 * (instant reveal via the band's `TooltipProvider`), the SAME idiom as the
 * editor pill and the desktop islands. Refine opens the bottom-`Sheet` variant
 * of `RefinePopover` (thumb-reachable).
 */
export function HomeActionsPill({
  chrome,
  typeOptions,
  onImportJson,
}: {
  chrome: HomeChrome
  typeOptions: readonly UMLDiagramType[]
  onImportJson?: () => void
}) {
  return (
    <TooltipProvider>
      <div
        aria-label="Home actions"
        className="apollon-glass apollon-chrome-island"
        style={ISLAND_LAYOUT_STYLE}
      >
        {/* ★ Favorites — direct 1-tap icon, pressed→favorite-star colour. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                aria-pressed={chrome.favoritesOnly}
                aria-label={
                  chrome.favoritesOnly
                    ? "Show all diagrams"
                    : "Show favorites only"
                }
                onClick={chrome.toggleFavoritesOnly}
                style={
                  chrome.favoritesOnly
                    ? { color: "var(--home-favorite-star)" }
                    : undefined
                }
              >
                <Star
                  className="size-[var(--apollon-chrome-icon)]"
                  fill={chrome.favoritesOnly ? "currentColor" : "none"}
                  aria-hidden
                />
              </button>
            }
          />
          <TooltipContent>Favorites</TooltipContent>
        </Tooltip>

        {/* Refine — opens the mobile bottom-sheet variant. */}
        <Tooltip>
          <RefinePopover
            variant="sheet"
            chrome={chrome}
            typeOptions={typeOptions}
            trigger={
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="apollon-chrome-iconbtn"
                    aria-label="Refine"
                  >
                    <SlidersHorizontal
                      className="size-[var(--apollon-chrome-icon)]"
                      aria-hidden
                    />
                    {chrome.refineCount > 0 && (
                      <Badge
                        className="pointer-events-none absolute -top-0.5 -right-0.5 size-4 min-w-0 px-0 text-[10px]"
                        aria-hidden
                      >
                        {chrome.refineCount}
                      </Badge>
                    )}
                  </button>
                }
              />
            }
          />
          <TooltipContent>Refine</TooltipContent>
        </Tooltip>

        {/* Import — direct 1-tap icon (FolderInput = ingest into the library;
            distinct from the editor's box+up-arrow Share motif). */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="apollon-chrome-iconbtn"
                aria-label="Import diagram"
                onClick={onImportJson}
              >
                <FolderInput
                  className="size-[var(--apollon-chrome-icon)]"
                  aria-hidden
                />
              </button>
            }
          />
          <TooltipContent>Import</TooltipContent>
        </Tooltip>

        {/* Help — its OWN dropdown (the shared Help/legal body), matching the
            editor pill's Help▾ rather than a merged "…" overflow. */}
        <MobileMenuButton
          id="home-help"
          label="Help"
          icon={
            <CircleHelpIcon
              className="size-[var(--apollon-chrome-icon)]"
              aria-hidden
            />
          }
        >
          {(close) => <HelpMenuItems onSelect={close} />}
        </MobileMenuButton>

        {/* Theme — a direct 1-tap icon toggle (no menu row needed). */}
        <ThemeSwitcherMenu />
      </div>
    </TooltipProvider>
  )
}
