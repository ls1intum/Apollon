import { FolderInput, SlidersHorizontal, Star } from "lucide-react"
import { DropdownMenuSeparator } from "@tumaet/ui/components/dropdown-menu"
import { Badge } from "@tumaet/ui/components/badge"
import type { UMLDiagramType } from "@tumaet/apollon"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"
import { ThemeSwitcherMenu } from "@/components/navbar/ThemeSwitcher"
import { ChromeOverflowMenu } from "@/components/navbar/MobileIslands"
import { RefinePopover } from "./RefinePopover"
import { HelpMenuItems } from "./HomeHelpMenu"
import type { HomeChrome } from "./useHomeChrome"

/**
 * Mobile actions pill (< md) — forked from the editor's `MobileActionsPill`, but
 * with HOME semantics (no Share / Version history). The resting pill surfaces the
 * three highest-value actions as direct 1-tap controls — ★ Favorites, Refine,
 * Import — and collapses only the lower-frequency items (Theme, Help/legal)
 * behind a "…" overflow dropdown.
 *
 * The overflow dropdown uses the canonical @tumaet/ui DropdownMenu DEFAULTS — the
 * same `text-sm`, padding and rounded-focus highlight as the editor's own desktop
 * menus (NavbarFile / NavbarHelp), which are the correct visual reference. The
 * only addition is `min-h-11` per row, which keeps the editor's typography and
 * padding while still meeting the 44px touch-target gate (and avoids the squared
 * `rounded-none` focus block that read as a stray "gray box"). Refine opens the
 * bottom-`Sheet` variant of `RefinePopover` (thumb-reachable).
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
    <div
      aria-label="Home actions"
      className="apollon-glass apollon-chrome-island"
      style={ISLAND_LAYOUT_STYLE}
    >
      {/* ★ Favorites — direct 1-tap icon, pressed→favorite-star colour. */}
      <button
        type="button"
        className="apollon-chrome-iconbtn"
        aria-pressed={chrome.favoritesOnly}
        aria-label={
          chrome.favoritesOnly ? "Show all diagrams" : "Show favorites only"
        }
        title="Favorites"
        onClick={chrome.toggleFavoritesOnly}
        style={
          chrome.favoritesOnly
            ? { color: "var(--home-favorite-star)" }
            : undefined
        }
      >
        <Star
          className="size-[18px]"
          fill={chrome.favoritesOnly ? "currentColor" : "none"}
          aria-hidden
        />
      </button>

      {/* Refine lives in the overflow menu and opens the mobile bottom-sheet. */}
      <RefinePopover
        variant="sheet"
        chrome={chrome}
        typeOptions={typeOptions}
        trigger={
          <button
            type="button"
            className="apollon-chrome-iconbtn"
            aria-label="Refine"
            title="Refine"
          >
            <SlidersHorizontal className="size-[18px]" aria-hidden />
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

      {/* Import — direct 1-tap icon (FolderInput = ingest into the library;
          distinct from the editor's box+up-arrow Share motif), surfaced out of
          the overflow. */}
      <button
        type="button"
        className="apollon-chrome-iconbtn"
        aria-label="Import diagram"
        title="Import"
        onClick={onImportJson}
      >
        <FolderInput className="size-[18px]" aria-hidden />
      </button>

      {/* "…" overflow — the SHARED `ChromeOverflowMenu` (identical trigger +
          content contract as the editor mobile pill). Holds only the
          lower-frequency Help/legal items, with Theme as the LAST row — matching
          the editor overflow exactly (Help body first, Theme last). */}
      <ChromeOverflowMenu ariaLabel="More options" id="home-options">
        {(close) => (
          <>
            {/* SHARED `HelpMenuItems` body — the same About → Releases → GitHub →
                Report, separator, Privacy → Imprint set/order used by every Help
                control. Theme is the LAST row, matching the editor overflow. */}
            <HelpMenuItems onSelect={close} />
            <DropdownMenuSeparator />
            <ThemeSwitcherMenu asMenuItem onToggle={close} />
          </>
        )}
      </ChromeOverflowMenu>
    </div>
  )
}
