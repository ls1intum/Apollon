import { useEffect, useRef, useState } from "react"
import {
  ChevronDownIcon,
  FolderInput,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { Badge } from "@tumaet/ui/components/badge"
import {
  GroupDivider,
  Island,
  IslandInput,
  ISLAND_LAYOUT_STYLE,
} from "@/components/navbar/islandPrimitives"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"
import { useMediaQuery } from "@/hooks"
import { BrandLockup } from "@/components/navbar/BrandLockup"
import { ThemeSwitcherMenu } from "@/components/navbar/ThemeSwitcher"
import { RefinePopover } from "./RefinePopover"
import { HomeRefinementChips } from "./HomeRefinementChips"
import { HomeBrandPill } from "./HomeBrandPill"
import { HomeActionsPill } from "./HomeActionsPill"
import { HomeHelpMenu } from "./HomeHelpMenu"
import type { HomeChrome } from "./useHomeChrome"

/**
 * The Home Island Band — the home's answer to the editor's `EditorHeaderRow`.
 * Built entirely from the shared island primitives + chrome tokens, so it reads
 * as the SAME floating-glass language as the editor chrome.
 *
 * One responsive component: desktop islands at `md+`, compact pills below `md`
 * (Tailwind `md` is the single structural switch for the home chrome, NOT the
 * editor's `isNarrow`). The chip line sits flush under the band whenever a
 * refinement is active.
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
    // Sticky wrapper: the band FLOATS above the scrolling cards the way the
    // editor header floats over the canvas. It pins to the top of the home
    // scroll container (clearing the top safe-area inset) at a z-index above the
    // cards, so the glass islands + their floating shadow overlay the grid as it
    // scrolls under. `top` matches the safe-area model; the scroll container's
    // own `pt-5/md:pt-6` is the resting offset, so there is no layout jump — the
    // band simply stops at `top` once that padding scrolls past. A small bottom
    // padding gives the floating island shadow room to read over the first row.
    <div className="sticky top-[calc(var(--safe-area-inset-top,0px)+0.75rem)] z-20 flex flex-col gap-[var(--apollon-chrome-gap)] pb-2 md:top-[calc(var(--safe-area-inset-top,0px)+1rem)]">
      {/* The home's single page heading — rendered ONCE here (outside the
          md-gated bands) so exactly one visually-hidden <h1> exists at every
          width. The desktop band shows a visible "Your diagrams" label aside the
          brand; the mobile pill is brand-only, so without this the phone layout
          would carry no <h1> at all. */}
      <h1 className="sr-only">Your diagrams</h1>

      {/* ── Desktop band (md+): three islands ── */}
      <div className="hidden items-start gap-[var(--apollon-chrome-gap)] md:flex">
        <HomeBrandIsland />
        <div className="flex min-w-[200px] flex-1">
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
 * LEFT desktop island (`role="banner"`): the brand lockup only. The page `<h1>`
 * lives in `HomeHeaderRow` (outside the md-gated bands) so it survives the mobile
 * layout where this island is hidden.
 */
function HomeBrandIsland() {
  return (
    <Island as="header" role="banner" ariaLabel="Home">
      <BrandLockup />
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
    // Grows with the centre track up to a max, then stops — LEFT-aligned, so the
    // remaining track stays open to its right rather than the field stretching
    // full width.
    <Island
      className="apollon-chrome-title-island w-full"
      ariaLabel="Search diagrams"
      style={{ maxWidth: "560px" }}
    >
      <Search
        className="size-3.5 shrink-0 text-[color:var(--apollon-chrome-text-muted)]"
        aria-hidden
      />
      <IslandInput
        ref={inputRef}
        type="search"
        value={chrome.searchTerm}
        onChange={(event) => chrome.setSearchTerm(event.target.value)}
        placeholder="Search diagrams"
        aria-label="Search diagrams by name"
        // Fills the island (no maxWidth cap that would leave the rest of the
        // grown centre island as dead glass on wide viewports).
        className="flex-1"
      />
      <span
        aria-hidden
        className="shrink-0 px-1 text-xs font-medium tabular-nums select-none text-[color:var(--apollon-chrome-text)]"
      >
        {count}
      </span>
    </Island>
  )
}

/**
 * RIGHT desktop island: ★ Favorites · Refine ▾ · Import / New diagram · Help ▾
 * · Theme, split into functional groups by hairline dividers. Icon controls use
 * the shared `.apollon-chrome-iconbtn` / `navbarButtonStyle` families, and Help
 * is the SHARED `HomeHelpMenu` (same source as the mobile pill + sub-routes).
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
  // Refine/Import reveal their labels at 940 ⇒ disable their icon-only tooltip
  // there, matching the Help/Save/Version family rule.
  const isWide = useMediaQuery("(min-width: 940px)")
  return (
    <TooltipProvider>
      <Island ariaLabel="Home actions">
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

        <GroupDivider />

        <Tooltip disabled={isWide}>
          <RefinePopover
            variant="popover"
            chrome={chrome}
            typeOptions={typeOptions}
            trigger={
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={navbarButtonStyle("relative")}
                    aria-label="Refine"
                  >
                    {/* Leading filter glyph + count badge, a label that reveals
                        once it fits (measured ~918px ⇒ `min-[940px]`, not `lg`),
                        and — because it opens a popover — a trailing caret. */}
                    <SlidersHorizontal className="size-4" aria-hidden />
                    <span className="hidden min-[940px]:inline">Refine</span>
                    {chrome.refineCount > 0 && (
                      <Badge className="size-4 min-w-0 px-0 text-[10px]">
                        {chrome.refineCount}
                      </Badge>
                    )}
                    <ChevronDownIcon className="size-4" aria-hidden />
                  </button>
                }
              />
            }
          />
          <TooltipContent>Refine</TooltipContent>
        </Tooltip>

        <GroupDivider />

        <Tooltip disabled={isWide}>
          <TooltipTrigger
            render={
              <button
                type="button"
                className={navbarButtonStyle()}
                aria-label="Import"
                onClick={onImportJson}
              >
                <FolderInput className="size-4" aria-hidden />
                {/* Same 940px threshold as Refine. */}
                <span className="hidden min-[940px]:inline">Import</span>
              </button>
            }
          />
          <TooltipContent>Import</TooltipContent>
        </Tooltip>
        <button
          type="button"
          className={navbarButtonStyle("apollon-chrome-accent-btn")}
          onClick={onNewDiagram}
        >
          <Plus className="size-4" aria-hidden />
          <span>New diagram</span>
        </button>

        <GroupDivider />

        <HomeHelpMenu reveal="wide" />
        <ThemeSwitcherMenu />
      </Island>
    </TooltipProvider>
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
          className="size-4 shrink-0 text-[color:var(--apollon-chrome-text-muted)]"
          aria-hidden
        />
        <span className="min-w-0 truncate text-sm font-medium text-[color:var(--apollon-chrome-text)]">
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
        className="size-4 shrink-0 text-[color:var(--apollon-chrome-text-muted)]"
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
        className="shrink-0 px-1 text-xs font-medium tabular-nums select-none text-[color:var(--apollon-chrome-text)]"
      >
        {count}
      </span>
    </div>
  )
}
