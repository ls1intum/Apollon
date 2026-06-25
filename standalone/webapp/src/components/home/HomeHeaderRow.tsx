import { useEffect, useRef, useState } from "react"
import { Plus, Search, SlidersHorizontal, Star, Upload } from "lucide-react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { Badge } from "@tumaet/ui/components/badge"
import {
  GroupDivider,
  Island,
  IslandInput,
  ISLAND_LAYOUT_STYLE,
} from "@/components/navbar/islandPrimitives"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"
import { BrandAndVersion } from "@/components/navbar/BrandAndVersion"
import { ThemeSwitcherMenu } from "@/components/navbar/ThemeSwitcher"
import { RefinePopover } from "./RefinePopover"
import { HomeRefinementChips } from "./HomeRefinementChips"
import { HomeBrandPill } from "./HomeBrandPill"
import { HomeActionsPill } from "./HomeActionsPill"
import type { HomeChrome } from "./useHomeChrome"

/**
 * The Home Island Band — the home's answer to the editor's `EditorHeaderRow`.
 * Built entirely from the shared island primitives + chrome tokens, so it reads
 * as the SAME floating-glass language as the editor chrome.
 *
 * One responsive component: desktop islands at `md+`, compact pills below `md`
 * (Tailwind `md` is the single structural switch — matching the home's existing
 * HomePage/HomeFooter/HomeNavbar cutover, NOT the editor's `isNarrow`). The chip
 * line sits flush under the band whenever a refinement is active.
 */
export type HomeHeaderRowProps = {
  chrome: HomeChrome
  /** Result count rendered in the search island's trailing chip. */
  count: number
  /** Available diagram types for the Refine "Type" block. */
  typeOptions: readonly UMLDiagramType[]
  onNewDiagram?: () => void
  onImportJson?: () => void
}

export function HomeHeaderRow({
  chrome,
  count,
  typeOptions,
  onNewDiagram,
  onImportJson,
}: HomeHeaderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* The home's single page heading — rendered ONCE here (outside the
          md-gated bands) so exactly one visually-hidden <h1> exists at every
          width. The desktop band shows a visible "Your diagrams" label aside the
          brand; the mobile pill is brand-only, so without this the phone layout
          would carry no <h1> at all. */}
      <h1 className="sr-only">Your diagrams</h1>

      {/* ── Desktop band (md+): three islands ── */}
      <div className="hidden items-start gap-[var(--apollon-chrome-gap)] md:flex">
        <HomeBrandIsland />
        <div className="flex min-w-0 flex-1 justify-center">
          <HomeSearchIsland chrome={chrome} count={count} />
        </div>
        <HomeActionsIsland
          chrome={chrome}
          typeOptions={typeOptions}
          onNewDiagram={onNewDiagram}
          onImportJson={onImportJson}
        />
      </div>

      {/* ── Mobile band (< md): pills + tap-to-search ── */}
      <div className="flex items-start gap-[var(--apollon-chrome-gap)] md:hidden">
        <HomeBrandPill />
        <div className="min-w-0 flex-1">
          <MobileSearchPill chrome={chrome} count={count} />
        </div>
        <HomeActionsPill
          chrome={chrome}
          typeOptions={typeOptions}
          onImportJson={onImportJson}
        />
      </div>

      {/* Chip line — flush under the band, only when a refinement is active. */}
      <HomeRefinementChips chrome={chrome} />
    </div>
  )
}

/**
 * LEFT desktop island (`role="banner"`): brand lockup + a quiet "Your diagrams"
 * label. The single page `<h1>` is rendered once by `HomeHeaderRow` (outside the
 * md-gated bands) so it survives the mobile layout where this island is hidden.
 */
function HomeBrandIsland() {
  return (
    <Island as="header" role="banner" ariaLabel="Home">
      <BrandAndVersion />
      <GroupDivider />
      <span
        aria-hidden
        className="text-sm font-semibold whitespace-nowrap"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        Your diagrams
      </span>
    </Island>
  )
}

/**
 * CENTER desktop island: a borderless search field on the glass surface with a
 * 14px Search prefix and a muted "{count}" trailing chip. ⌘K focuses it (a
 * global desktop accelerator — NOT the only path to search).
 */
function HomeSearchIsland({
  chrome,
  count,
}: {
  chrome: HomeChrome
  count: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <Island
      className="apollon-chrome-title-island w-full"
      ariaLabel="Search diagrams"
    >
      <Search
        className="size-3.5 shrink-0"
        style={{ color: "var(--apollon-chrome-text-muted)" }}
        aria-hidden
      />
      <IslandInput
        ref={inputRef}
        type="search"
        value={chrome.searchTerm}
        onChange={(event) => chrome.setSearchTerm(event.target.value)}
        placeholder="Search diagrams"
        aria-label="Search diagrams by name"
        className="flex-1"
        style={{ maxWidth: "min(520px, 100%)" }}
      />
      <span
        aria-hidden
        className="shrink-0 px-1 text-xs font-medium tabular-nums select-none"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        {count}
      </span>
    </Island>
  )
}

/**
 * RIGHT desktop island: ★ Favorites · Refine ▾ · Import / New diagram · Theme,
 * split into functional groups by hairline dividers. Icon controls use the
 * shared `.apollon-chrome-iconbtn` / `navbarButtonStyle` families.
 */
function HomeActionsIsland({
  chrome,
  typeOptions,
  onNewDiagram,
  onImportJson,
}: {
  chrome: HomeChrome
  typeOptions: readonly UMLDiagramType[]
  onNewDiagram?: () => void
  onImportJson?: () => void
}) {
  return (
    <Island ariaLabel="Home actions">
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

      <GroupDivider />

      <RefinePopover
        variant="popover"
        chrome={chrome}
        typeOptions={typeOptions}
        trigger={
          <button
            type="button"
            className={navbarButtonStyle("relative")}
            aria-label="Refine"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>Refine</span>
            {chrome.refineCount > 0 && (
              <Badge className="ml-0.5 size-4 min-w-0 px-0 text-[10px]">
                {chrome.refineCount}
              </Badge>
            )}
          </button>
        }
      />

      <GroupDivider />

      <button
        type="button"
        className={navbarButtonStyle()}
        onClick={onImportJson}
      >
        <Upload className="size-4" aria-hidden />
        <span className="hidden lg:inline">Import</span>
      </button>
      <button
        type="button"
        className={navbarButtonStyle()}
        onClick={onNewDiagram}
        style={{
          background: "var(--apollon-chrome-accent)",
          color: "var(--apollon-chrome-accent-contrast)",
        }}
      >
        <Plus className="size-4" aria-hidden />
        <span>New diagram</span>
      </button>

      <GroupDivider />

      <ThemeSwitcherMenu />
    </Island>
  )
}

/**
 * Mobile center: a full-width tap-to-search glass pill (Search icon + "Search
 * diagrams") that expands INLINE into a borderless field and filters as you
 * type — no modal. Collapses back to the prompt when emptied + blurred.
 */
function MobileSearchPill({
  chrome,
  count,
}: {
  chrome: HomeChrome
  count: number
}) {
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = () => {
    setExpanded(true)
    // Focus after the field mounts.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const isActive = expanded || chrome.searchTerm.length > 0

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Search diagrams"
        className="apollon-glass apollon-chrome-island w-full cursor-pointer"
        style={{ ...ISLAND_LAYOUT_STYLE, width: "100%" }}
      >
        <Search
          className="size-4 shrink-0"
          style={{ color: "var(--apollon-chrome-text-muted)" }}
          aria-hidden
        />
        <span
          className="min-w-0 truncate text-sm font-medium"
          style={{ color: "var(--apollon-chrome-text)" }}
        >
          Search diagrams
        </span>
      </button>
    )
  }

  return (
    <div
      className="apollon-glass apollon-chrome-island apollon-chrome-title-island w-full"
      style={{ ...ISLAND_LAYOUT_STYLE, width: "100%" }}
    >
      <Search
        className="size-4 shrink-0"
        style={{ color: "var(--apollon-chrome-text-muted)" }}
        aria-hidden
      />
      <IslandInput
        ref={inputRef}
        type="search"
        value={chrome.searchTerm}
        onChange={(event) => chrome.setSearchTerm(event.target.value)}
        onBlur={() => setExpanded(false)}
        placeholder="Search diagrams"
        aria-label="Search diagrams by name"
        className="flex-1"
      />
      <span
        aria-hidden
        className="shrink-0 px-1 text-xs font-medium tabular-nums select-none"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        {count}
      </span>
    </div>
  )
}
