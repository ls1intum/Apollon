import { useState } from "react"
import {
  Moon,
  MoreVertical,
  SlidersHorizontal,
  Star,
  Sun,
  Upload,
} from "lucide-react"
import { Link } from "@tanstack/react-router"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { Badge } from "@tumaet/ui/components/badge"
import type { UMLDiagramType } from "@tumaet/apollon"
import { releasesLink, repositoryLink } from "@/constants/version"
import { bugReportURL } from "@/constants/urls"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"
import { useModalContext } from "@/contexts"
import { readNavFrom } from "@/lib/navProvenance"
import { useLocation } from "@tanstack/react-router"
import { useThemeStore } from "@/stores/useThemeStore"
import { useShallow } from "zustand/shallow"
import { RefinePopover } from "./RefinePopover"
import type { HomeChrome } from "./useHomeChrome"

/**
 * Mobile actions pill (< md) — forked from the editor's `MobileActionsPill`, but
 * with HOME semantics (no Share / Version history). The resting pill surfaces the
 * three highest-value actions as direct 1-tap controls — ★ Favorites, Refine,
 * ⬆ Import — and collapses only the lower-frequency items (Theme, Help/legal)
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
  const { currentTheme, toggleTheme } = useThemeStore(
    useShallow((state) => ({
      currentTheme: state.currentTheme,
      toggleTheme: state.toggleTheme,
    }))
  )
  const { openModal } = useModalContext()
  // Forward the inherited origin so a legal hop still returns to the diagram.
  const from = readNavFrom(useLocation().state)
  const legalLinkState = from ? { from } : undefined
  const isDarkMode = currentTheme === "dark"
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

      {/* ⬆ Import — direct 1-tap icon, surfaced out of the overflow. */}
      <button
        type="button"
        className="apollon-chrome-iconbtn"
        aria-label="Import diagram"
        title="Import"
        onClick={onImportJson}
      >
        <Upload className="size-[18px]" aria-hidden />
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
          className="w-56 max-w-[calc(100vw-1rem)] [&_[data-slot=dropdown-menu-item]]:min-h-11"
        >
          {/* Theme leads; the remaining items mirror `HomeHelpMenu` exactly
              (About → Releases → GitHub → Report, separator, Privacy/Imprint)
              so the home's Help item SET/ORDER is identical everywhere. */}
          <DropdownMenuItem
            onClick={() => {
              toggleTheme()
              closeMenu()
            }}
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {isDarkMode ? <Sun aria-hidden /> : <Moon aria-hidden />}
            Theme
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              openModal("AboutModal")
              closeMenu()
            }}
          >
            About
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={releasesLink}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                Releases
              </a>
            }
          />
          <DropdownMenuItem
            render={
              <a
                href={repositoryLink}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                GitHub
              </a>
            }
          />
          <DropdownMenuItem
            render={
              <a
                href={bugReportURL}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                Report a problem
              </a>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link to="/privacy" state={legalLinkState} onClick={closeMenu}>
                Privacy
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/imprint" state={legalLinkState} onClick={closeMenu}>
                Imprint
              </Link>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
