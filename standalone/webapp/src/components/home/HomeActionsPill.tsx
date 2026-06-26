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
 * Mobile actions pill (< md), home semantics (no Share / Version history). Every
 * control is a direct icon — ★ Favorites · Refine · Import · Help▾ · Theme — in
 * the same left-to-right order as the desktop actions island so nothing jumps
 * position between the two layouts. Each icon-only control wears the shared
 * {@link Tooltip} as its visible name (instant reveal via the band's
 * `TooltipProvider`). Refine opens the bottom-`Sheet` variant of `RefinePopover`.
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

        {/* Import — FolderInput (ingest into the library), distinct from the
            editor's Share motif. */}
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

        {/* Help — its own dropdown (the shared Help/legal body), not a merged
            "…" overflow. */}
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

        <ThemeSwitcherMenu />
      </div>
    </TooltipProvider>
  )
}
