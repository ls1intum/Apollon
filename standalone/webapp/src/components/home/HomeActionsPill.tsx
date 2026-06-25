import { useState } from "react"
import {
  FolderInput,
  MoreVertical,
  SlidersHorizontal,
  Star,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { Badge } from "@tumaet/ui/components/badge"
import type { UMLDiagramType } from "@tumaet/apollon"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"
import { ThemeSwitcherMenu } from "@/components/navbar/ThemeSwitcher"
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
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

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

      {/* "…" overflow — only the lower-frequency Theme + Help/legal items.
          Uses the @tumaet/ui DropdownMenu defaults (editor-matched text-sm /
          padding / rounded focus); `min-h-11` per row keeps the 44px target. */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className="apollon-chrome-iconbtn"
          aria-label="More options"
          title="More"
        >
          <MoreVertical className="size-[18px]" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          className="w-60 max-w-[calc(100vw-1rem)] [&_[data-slot=dropdown-menu-item]]:min-h-11"
        >
          {/* Theme leads via the SHARED `ThemeSwitcherMenu asMenuItem` (identical
              to the editor mobile overflow's Theme row), then the SHARED
              `HelpMenuItems` body — the same About → Releases → GitHub → Report,
              separator, Privacy → Imprint set/order used by every Help control. */}
          <ThemeSwitcherMenu asMenuItem onToggle={closeMenu} />
          <DropdownMenuSeparator />
          <HelpMenuItems onSelect={closeMenu} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
