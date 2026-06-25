import { ReactNode, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { IconButton } from "@tumaet/ui/components/icon-button"
import { MoreVerticalIcon, ShareIcon } from "lucide-react"
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
 * The ONE shared "…" overflow control reused by BOTH the editor mobile pill and
 * the home mobile pill — a `DropdownMenuTrigger` wearing `.apollon-chrome-iconbtn`
 * directly (no IconButton wrapper to avoid double-styling), a `MoreVertical`
 * glyph, and the shared overflow `DropdownMenuContent` contract: `w-60`, capped to
 * the viewport minus safe-area + 16px, and every row forced to a 44px `min-h-11`.
 *
 * Children receive a `close` callback so each row can dismiss the menu after it
 * acts. Owning the open state here is what lets BOTH callers stay identical.
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
        title="More"
      >
        <MoreVerticalIcon className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-labelledby={triggerId}
        align="end"
        side="bottom"
        className="flex w-60 max-w-[calc(100vw-var(--safe-area-inset-left,0px)-var(--safe-area-inset-right,0px)-16px)] flex-col [&_[data-slot=dropdown-menu-item]]:min-h-11"
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
 * Right cluster on narrow phones: a true overflow bar (not a single hamburger).
 * The two highest-value actions stay reachable as direct icons — Share
 * (collaboration is the reason to be here on a phone) and Version history — and
 * only the trailing, lower-frequency actions (File, Save copy, Help, theme)
 * collapse behind a "…" (MoreVert) menu. The diagram title is NOT here — it
 * lives in the header's centre track (see EditorHeaderRow).
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
          family (size/hover/radius/focus) as the zoom/minimap controls. */}
      <IconButton
        ariaLabel="Share"
        tooltip="Share"
        className="apollon-chrome-iconbtn"
        onClick={() => openModal("SHARE", { dialogVariant: "home" })}
      >
        <ShareIcon className="size-4" aria-hidden />
      </IconButton>
      <VersionHistoryButton labelClassName="hidden" />
      {/* Trailing, lower-frequency actions collapse behind the SHARED overflow
          control. File INLINES its leaves (FileMenuItems) so there is never a
          DropdownMenu-inside-a-DropdownMenu; Save is a real 44px menu row
          (asMenuItem); Theme is the LAST row, matching every overflow. */}
      <ChromeOverflowMenu id="mobile-options">
        {(close) => (
          <>
            <FileMenuItems onSelect={close} />
            <DropdownMenuSeparator />
            <SaveLocalCopyButton asMenuItem onAfter={close} />
            <DropdownMenuSeparator />
            {/* Help INLINES its shared body (editor variant) — never a nested
                menu — matching the home overflow; Theme is the LAST row. */}
            <HelpMenuItems variant="editor" onSelect={close} />
            <ThemeSwitcherMenu asMenuItem onToggle={close} />
          </>
        )}
      </ChromeOverflowMenu>
    </div>
  )
}
