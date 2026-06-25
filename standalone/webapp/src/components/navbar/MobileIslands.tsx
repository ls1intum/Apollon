import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { IconButton } from "@tumaet/ui/components/icon-button"
import { MoreVerticalIcon, ShareIcon } from "lucide-react"
import { useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { ISLAND_LAYOUT_STYLE } from "./islandPrimitives"

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
  const [open, setOpen] = useState(false)
  const { openModal } = useModalContext()
  const close = () => setOpen(false)

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
      {/* Trailing, lower-frequency actions collapse behind the overflow menu. */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          id="mobile-options-button"
          render={
            <IconButton
              ariaLabel="open options"
              tooltip="More"
              className="apollon-chrome-iconbtn"
            >
              <MoreVerticalIcon className="size-4" aria-hidden />
            </IconButton>
          }
        />
        <DropdownMenuContent
          id="mobile-options-menu"
          aria-labelledby="mobile-options-button"
          align="end"
          side="bottom"
          className="flex w-60 max-w-[calc(100vw-var(--safe-area-inset-left,0px)-var(--safe-area-inset-right,0px)-16px)] flex-col [&_[data-slot=dropdown-menu-item]]:min-h-11"
        >
          {/* Back lives in the back pill; Share + Version on the bar; title in
              the header centre — so the menu is just the low-frequency tail. */}
          <NavbarFile
            color="var(--apollon-primary-contrast)"
            handleCloseNavMenu={close}
          />
          <SaveLocalCopyButton
            color="var(--apollon-primary-contrast)"
            onAfter={close}
          />
          <NavbarHelp color="var(--apollon-primary-contrast)" />
          <ThemeSwitcherMenu asMenuItem onToggle={close} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
