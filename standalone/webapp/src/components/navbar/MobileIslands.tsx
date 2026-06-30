import { ReactNode, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { IconButton } from "@tumaet/ui/components/icon-button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { CircleHelpIcon, FilesIcon, ShareIcon } from "lucide-react"
import { useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { FileMenuItems } from "./FileMenu"
import { HelpMenuItems } from "@/components/home/HomeHelpMenu"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"
import {
  ISLAND_LAYOUT_STYLE,
  MOBILE_MENU_CONTENT_CLASS,
} from "./islandPrimitives"

/**
 * An ICON-ONLY menu trigger for the mobile editor pill: a `.apollon-chrome-iconbtn`
 * glyph (one family with the Share / Version / Theme icons) that opens its OWN
 * small dropdown. Carries an `aria-label` plus the shared {@link Tooltip} as its
 * visible name, composed onto the trigger via Base UI's `render=` so one button is
 * both tooltip-anchor and menu-trigger. Keeps File and Help as two separate,
 * scannable menus on the phone (no merged mega-overflow), each with its own
 * trigger + inlined body. `children` receive a `close` callback to dismiss it.
 */
export function MobileMenuButton({
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
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              id={triggerId}
              className="apollon-chrome-iconbtn"
              aria-label={label}
            >
              {icon}
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
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
 * Right cluster on narrow phones — a compact row of icon-only triggers:
 *
 *   File▾ · Share · Version · Help▾ · Theme
 *
 * The left-to-right order matches the desktop actions island exactly, so no
 * control jumps position between bar and pill — Save just folds into File▾ here
 * (it has no standalone slot). File and Help stay as two separate dropdowns (not
 * one mega-overflow) so each is a small, scannable menu. Each icon-only control
 * carries a tooltip as its accessible name.
 */
export function MobileActionsPill() {
  const { openModal } = useModalContext()

  return (
    <div
      aria-label="Editor actions"
      className="apollon-glass apollon-chrome-island"
      style={PILL_STYLE}
    >
      {/* File — New / Import + the flat Export group, then Save-a-local-copy
          (parked here off the desktop bar to keep the pill compact). */}
      <MobileMenuButton
        id="mobile-file"
        label="File"
        icon={
          <FilesIcon
            className="size-[var(--apollon-chrome-icon)]"
            aria-hidden
          />
        }
      >
        {(close) => (
          <>
            <FileMenuItems onSelect={close} />
            <DropdownMenuSeparator />
            <SaveLocalCopyButton variant="menuItem" onAfter={close} />
          </>
        )}
      </MobileMenuButton>

      {/* Share + Version stay visible as icons in the .apollon-chrome-iconbtn
          family; each is icon-only, so its tooltip supplies the visible name. */}
      <IconButton
        ariaLabel="Share"
        tooltip="Share"
        className="apollon-chrome-iconbtn"
        onClick={() => openModal("SHARE", { dialogVariant: "home" })}
      >
        <ShareIcon className="size-4" aria-hidden />
      </IconButton>
      <VersionHistoryButton variant="icon" />

      {/* Help — its OWN dropdown (separate from File). The shared Help/legal body
          in the editor variant. */}
      <MobileMenuButton
        id="mobile-help"
        label="Help"
        icon={
          <CircleHelpIcon
            className="size-[var(--apollon-chrome-icon)]"
            aria-hidden
          />
        }
      >
        {(close) => <HelpMenuItems variant="editor" onSelect={close} />}
      </MobileMenuButton>

      {/* Theme — a direct 1-tap icon toggle (no menu row needed). */}
      <ThemeSwitcherMenu />
    </div>
  )
}
