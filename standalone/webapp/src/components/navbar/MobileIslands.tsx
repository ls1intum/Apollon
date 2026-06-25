import { ReactNode, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { IconButton } from "@tumaet/ui/components/icon-button"
import {
  CircleHelpIcon,
  FilesIcon,
  MoreVerticalIcon,
  ShareIcon,
} from "lucide-react"
import { useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { FileMenuItems } from "./NavbarFile"
import { HelpMenuItems } from "@/components/home/HomeHelpMenu"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { ISLAND_LAYOUT_STYLE } from "./islandPrimitives"

/**
 * The shadcn `DropdownMenuContent` contract every mobile chrome menu shares: a
 * fixed `w-60` capped to the viewport (minus safe-area + 16px) so a phone never
 * overflows it, with every row forced to a 44px `min-h-11` touch target. Pulled
 * out as a constant so the editor's File / Help menus and the home overflow all
 * size and space their rows identically.
 */
const MOBILE_MENU_CONTENT_CLASS =
  "flex w-60 max-w-[calc(100vw-var(--safe-area-inset-left,0px)-var(--safe-area-inset-right,0px)-16px)] flex-col [&_[data-slot=dropdown-menu-item]]:min-h-11"

/**
 * An ICON-ONLY menu trigger for the mobile editor pill: a `.apollon-chrome-iconbtn`
 * glyph (so it reads as one family with the Share / Version / Theme icons) that
 * opens its OWN small dropdown. Because the trigger has no visible text label it
 * carries BOTH an `aria-label` (the accessible name) and a native `title` (the
 * on-hover visible name) — the same icon-only tooltip idiom as
 * `ThemeSwitcherButton` and `ChromeOverflowMenu`. A `title` is used rather than
 * the shared `Tooltip` component on purpose: two base-ui triggers (Tooltip +
 * DropdownMenu) on one button fight over the press handler and the menu never
 * opens. Keeping a `title` is correct here — these are icon-only controls — and
 * is the opposite of the redundant `Tooltip` removed from the labelled Share
 * button.
 *
 * This is what keeps File and Help as TWO SEPARATE, scannable menus on the phone
 * (no merged mega-overflow): each gets its own trigger + its own inlined body.
 * `children` receive a `close` callback so a chosen row can dismiss the menu.
 */
function MobileMenuButton({
  label,
  icon,
  id,
  children,
}: {
  label: string
  icon: ReactNode
  id: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const triggerId = `${id}-button`

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={triggerId}
        className="apollon-chrome-iconbtn"
        aria-label={label}
        title={label}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-labelledby={triggerId}
        align="end"
        side="bottom"
        className={MOBILE_MENU_CONTENT_CLASS}
      >
        {children(close)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The shared "…" overflow control still used by the HOME mobile pill — a
 * `DropdownMenuTrigger` wearing `.apollon-chrome-iconbtn` directly (no IconButton
 * wrapper to avoid double-styling), a `MoreVertical` glyph, and the shared
 * {@link MOBILE_MENU_CONTENT_CLASS} content contract.
 *
 * The EDITOR mobile pill no longer uses this — per user direction it keeps File
 * and Help as two SEPARATE {@link MobileMenuButton} menus rather than merging
 * everything into one overflow. The home pill (a much shorter Help+Theme tail)
 * still reads best as a single "…", so the control stays for it.
 *
 * Children receive a `close` callback so each row can dismiss the menu after it
 * acts.
 */
export function ChromeOverflowMenu({
  /**
   * Accessible name of BOTH the trigger button and (via `aria-labelledby`) the
   * menu it opens — so the overflow menu keeps a real accessible name (e2e selects
   * the editor's by `name: "open options"`). Defaults to "open options".
   */
  ariaLabel = "open options",
  /** Unique id pair for the trigger ↔ menu `aria-labelledby` link. */
  id = "chrome-overflow",
  children,
}: {
  ariaLabel?: string
  id?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const triggerId = `${id}-button`

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={triggerId}
        className="apollon-chrome-iconbtn"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <MoreVerticalIcon className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-labelledby={triggerId}
        align="end"
        side="bottom"
        className={MOBILE_MENU_CONTENT_CLASS}
      >
        {children(close)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact mobile chrome pills (same material + height as the desktop islands),
 * sized to the phone-portrait / phone-landscape height budget. They reuse the
 * shared island flex box (ISLAND_LAYOUT_STYLE) — only the height-budget token
 * differs between portrait/landscape, and that lives on the token, not here.
 */
const PILL_STYLE = ISLAND_LAYOUT_STYLE

/**
 * Left cluster on narrow phones: an ALWAYS-visible back affordance, NO brand
 * mark (on a phone the logo/wordmark is noise that crowds out controls). Still
 * the single <header role="banner"> so the "All diagrams" link stays scoped to
 * the banner landmark for the e2e suite.
 */
export function MobileBackPill() {
  return (
    <header
      role="banner"
      aria-label="Editor"
      className="apollon-glass apollon-chrome-island"
      style={PILL_STYLE}
    >
      {/* Chevron-only back (label hidden); the link's aria-label keeps the
          accessible name "All diagrams". */}
      <BackNav to="/" label={ALL_DIAGRAMS_LABEL} labelClassName="hidden" />
    </header>
  )
}

/**
 * Right cluster on narrow phones: a compact row of icon controls — NOT a single
 * mega-overflow. Per user direction the editor keeps File and Help as TWO
 * SEPARATE menus on the phone (each a small, scannable dropdown), so the pill is:
 *
 *   Share · Version · File▾ · Help▾ · Theme
 *
 * all collapsed to icon-only triggers so they fit a 390px pill beside the back
 * pill + title. File▾ opens its own dropdown — New / Import + the flat Export
 * group, plus Save-a-local-copy (a file action, parked here to save pill space).
 * Help▾ opens the shared Help/legal body (editor variant). Theme is a direct
 * 1-tap icon toggle. No nested flyouts, no 18-item dump.
 *
 * Every icon-only control carries a tooltip (its only visible name) — keeping
 * those is correct, unlike the redundant tooltip removed from the labelled
 * desktop Share button. The diagram title is NOT here — it lives in the header's
 * centre track (see EditorHeaderRow).
 */
export function MobileActionsPill() {
  const { openModal } = useModalContext()

  return (
    <div
      aria-label="Editor actions"
      className="apollon-glass apollon-chrome-island"
      style={PILL_STYLE}
    >
      {/* Primary actions stay visible as icons — same .apollon-chrome-iconbtn
          family (size/hover/radius/focus) as the zoom/minimap controls. Each is
          icon-only, so its tooltip is its visible name and is kept. */}
      <IconButton
        ariaLabel="Share"
        tooltip="Share"
        className="apollon-chrome-iconbtn"
        onClick={() => openModal("SHARE", { dialogVariant: "home" })}
      >
        <ShareIcon className="size-4" aria-hidden />
      </IconButton>
      <VersionHistoryButton labelClassName="hidden" />

      {/* File — its OWN dropdown (not merged with Help). New / Import + the flat
          labelled Export group, then Save-a-local-copy (a file action, parked
          here off the desktop bar to keep the pill compact). */}
      <MobileMenuButton
        id="mobile-file"
        label="File"
        icon={<FilesIcon className="size-[18px]" aria-hidden />}
      >
        {(close) => (
          <>
            <FileMenuItems onSelect={close} />
            <DropdownMenuSeparator />
            <SaveLocalCopyButton asMenuItem onAfter={close} />
          </>
        )}
      </MobileMenuButton>

      {/* Help — its OWN dropdown (separate from File). The shared Help/legal body
          in the editor variant. */}
      <MobileMenuButton
        id="mobile-help"
        label="Help"
        icon={<CircleHelpIcon className="size-[18px]" aria-hidden />}
      >
        {(close) => <HelpMenuItems variant="editor" onSelect={close} />}
      </MobileMenuButton>

      {/* Theme — a direct 1-tap icon toggle (no menu row needed). */}
      <ThemeSwitcherMenu />
    </div>
  )
}
