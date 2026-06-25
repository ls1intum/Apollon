import { useState } from "react"
import { MoreVertical, SlidersHorizontal, Star, Upload } from "lucide-react"
import { Link } from "@tanstack/react-router"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { Badge } from "@tumaet/ui/components/badge"
import { Moon, Sun } from "lucide-react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { releasesLink, repositoryLink } from "@/constants/version"
import { bugReportURL } from "@/constants/urls"
import { ISLAND_LAYOUT_STYLE } from "@/components/navbar/islandPrimitives"
import { useThemeStore } from "@/stores/useThemeStore"
import { useShallow } from "zustand/shallow"
import { RefinePopover } from "./RefinePopover"
import type { HomeChrome } from "./useHomeChrome"

/**
 * Mobile actions pill (< md) — forked from the editor's `MobileActionsPill`, but
 * with HOME semantics (no Share / Version history). The single highest-value
 * action stays a direct 1-tap icon — ★ Favorites — and the lower-frequency
 * actions (Refine, Import, Theme, Help/legal) collapse behind a "…" overflow
 * dropdown.
 *
 * The overflow dropdown reuses the editor's themed `[&>*]:min-h-[42px]` content
 * contract so every row is a ≥42px touch target in light + dark. Refine opens
 * the bottom-`Sheet` variant of `RefinePopover` (thumb-reachable); its trigger
 * is a `DropdownMenuItem` so it slots into the same menu.
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

      {/* "…" overflow — Import, Theme, Help/legal — themed ≥42px rows. */}
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
          className="flex w-60 max-w-[calc(100vw-1rem)] flex-col text-[color:var(--apollon-primary-contrast)] [&>*]:min-h-[42px] [&>*]:w-full [&>*]:justify-start [&>*]:rounded-none [&>*]:px-4 [&>*]:text-base"
        >
          <DropdownMenuItem
            onClick={() => {
              onImportJson?.()
              closeMenu()
            }}
          >
            <Upload className="size-[18px]" aria-hidden /> Import
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              toggleTheme()
              closeMenu()
            }}
            className="justify-between"
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span className="inline-flex items-center gap-2">
              {isDarkMode ? (
                <Sun className="size-[18px]" aria-hidden />
              ) : (
                <Moon className="size-[18px]" aria-hidden />
              )}
              Theme
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link to="/privacy" onClick={closeMenu}>
                Privacy
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/imprint" onClick={closeMenu}>
                Imprint
              </Link>
            }
          />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
