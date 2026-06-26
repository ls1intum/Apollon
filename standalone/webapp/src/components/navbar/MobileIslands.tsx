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
import {
  ISLAND_LAYOUT_STYLE,
  MOBILE_MENU_CONTENT_CLASS,
} from "./islandPrimitives"

/**
 * An ICON-ONLY menu trigger for the mobile editor pill: a `.apollon-chrome-iconbtn`
 * glyph (so it reads as one family with the Share / Version / Theme icons) that
 * opens its OWN small dropdown. With no visible text label it carries an
 * `aria-label` (the accessible name) and the shared {@link Tooltip} as its
 * on-hover/-focus visible name — the SAME instant-reveal tooltip idiom as every
 * other icon-only chrome control, composed onto the menu trigger via Base UI's
 * `render=` so one button is both tooltip-anchor and menu-trigger.
 *
 * This is what keeps File and Help as TWO SEPARATE, scannable menus on the phone
 * (no merged mega-overflow): each gets its own trigger + its own inlined body.
 * `children` receive a `close` callback so a chosen row can dismiss the menu.
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
 * The "…" overflow control for the chrome SUB-ROUTE pill (imprint / privacy /
 * 404): a `DropdownMenuTrigger` wearing `.apollon-chrome-iconbtn` directly (no
 * IconButton wrapper, to avoid double-styling), the shared instant-reveal
 * {@link Tooltip}, and the shared {@link MOBILE_MENU_CONTENT_CLASS} contract.
 * The sub-route's short Help + Theme tail reads as one menu. The editor and home
 * pills instead keep Help as its own {@link MobileMenuButton} dropdown — no
 * merged overflow. Children receive a `close` callback to dismiss after acting.
 */
export function ChromeOverflowMenu({
  /**
   * Accessible name of BOTH the trigger button and (via `aria-labelledby`) the
   * menu it opens, so the overflow keeps a real accessible name (the sub-route
   * passes "More options", which the e2e suite selects by). Defaults to
   * "More options".
   */
  ariaLabel = "More options",
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
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              id={triggerId}
              className="apollon-chrome-iconbtn"
              aria-label={ariaLabel}
            >
              <MoreVerticalIcon
                className="size-[var(--apollon-chrome-icon)]"
                aria-hidden
              />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>{ariaLabel}</TooltipContent>
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
 * Right cluster on narrow phones — a compact row of icon-only triggers that fits
 * a 390px pill beside the back pill + title:
 *
 *   File▾ · Share · Version · Help▾ · Theme
 *
 * The left-to-right order matches the desktop actions island exactly, so no
 * control jumps position between the desktop bar and this pill — Save just folds
 * into File▾ here (it has no standalone slot on the pill) without moving the
 * visible siblings. File and Help stay as two separate dropdowns (not one
 * mega-overflow) so each is a small, scannable menu. File▾ holds New / Import,
 * the flat Export group, and Save-a-local-copy; Help▾ is the shared Help/legal
 * body. Each icon-only control carries a tooltip as its accessible name. The
 * diagram title lives in the header's centre track, not here.
 */
export function MobileActionsPill() {
  const { openModal } = useModalContext()

  return (
    <div
      aria-label="Editor actions"
      className="apollon-glass apollon-chrome-island"
      style={PILL_STYLE}
    >
      {/* File — its OWN dropdown (not merged with Help). New / Import + the flat
          labelled Export group, then Save-a-local-copy (a file action, parked
          here off the desktop bar to keep the pill compact). */}
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
            <SaveLocalCopyButton asMenuItem onAfter={close} />
          </>
        )}
      </MobileMenuButton>

      {/* Share + Version stay visible as icons — same .apollon-chrome-iconbtn
          family (size/hover/radius/focus) as the zoom/minimap controls. Each is
          icon-only, so its tooltip supplies the otherwise-missing visible name. */}
      <IconButton
        ariaLabel="Share"
        tooltip="Share"
        className="apollon-chrome-iconbtn"
        onClick={() => openModal("SHARE", { dialogVariant: "home" })}
      >
        <ShareIcon className="size-4" aria-hidden />
      </IconButton>
      <VersionHistoryButton iconOnly />

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
