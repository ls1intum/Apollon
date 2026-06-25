import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "@tumaet/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { useModalContext } from "@/contexts"
import { bugReportURL } from "@/constants/urls"
import { releasesLink, repositoryLink } from "@/constants/version"
import { readNavFrom } from "@/lib/navProvenance"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"

/**
 * The SINGLE Help/legal menu source for the WHOLE app — home band, home mobile
 * overflow, the chrome sub-route header, AND the editor (desktop + mobile
 * overflow). Both the home and the editor Help controls render the SAME
 * {@link HelpMenuItems} body, so the item SET, ORDER, labels, surface, and a11y
 * are identical everywhere and can never drift.
 *
 * Item order (shared tail): About → Releases → GitHub → Report a problem,
 * separator, then the legal links Privacy → Imprint. The `editor` variant adds
 * the two editor-only entries around that tail — "How does this Editor Work?"
 * leads, and "Open Playground" sits just before the legal separator — without
 * forking the surface or the shared items.
 *
 * The legal `<Link>`s forward the INHERITED origin via `state={{ from }}` (the
 * `readNavFrom` provenance idiom) so an editor → legal hop still offers a real
 * "back to diagram".
 */

export type HelpMenuVariant = "home" | "editor"

/**
 * The shared Help/legal item body. Rendered directly inside any
 * `DropdownMenuContent` (the home/editor Help menus) OR inlined into a larger
 * overflow menu (the home mobile "…" pill), so the same items appear with the
 * same labels and order in every surface.
 */
export function HelpMenuItems({
  variant = "home",
  onSelect,
}: {
  variant?: HelpMenuVariant
  /** Closes the surrounding menu after an item is chosen. */
  onSelect: () => void
}) {
  const { openModal } = useModalContext()
  const location = useLocation()
  // Provenance for the legal links differs by where Help lives:
  //  • editor  → this IS the origin, so STAMP the current diagram path as `from`
  //    (so /privacy can offer a real "Back to diagram").
  //  • home / sub-route → this page is itself a hop, so FORWARD the inherited
  //    `from` (an imprint → privacy hop still returns to the diagram, not to
  //    /imprint). `readNavFrom` reads the origin out of the current router state.
  const from =
    variant === "editor"
      ? location.pathname + location.searchStr
      : readNavFrom(location.state)
  const legalLinkState = from ? { from } : undefined

  return (
    <>
      {variant === "editor" && (
        <DropdownMenuItem
          onClick={() => {
            openModal("HowToUseModal")
            onSelect()
          }}
        >
          How does this Editor Work?
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => {
          openModal("AboutModal")
          onSelect()
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
            onClick={onSelect}
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
            onClick={onSelect}
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
            onClick={onSelect}
          >
            Report a problem
          </a>
        }
      />
      {variant === "editor" && (
        <DropdownMenuItem
          render={
            <Link to="/playground" onClick={onSelect}>
              Open Playground
            </Link>
          }
        />
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        render={
          <Link to="/privacy" state={legalLinkState} onClick={onSelect}>
            Privacy
          </Link>
        }
      />
      <DropdownMenuItem
        render={
          <Link to="/imprint" state={legalLinkState} onClick={onSelect}>
            Imprint
          </Link>
        }
      />
    </>
  )
}

/**
 * The Help dropdown: the standardized text-trigger composition shared with the
 * editor's File menu — a shadcn `Button variant="ghost" size="sm"` wearing
 * `navbarButtonStyle()` (via `render=`) + a trailing `ChevronDownIcon` — so every
 * "Label ▾" menu trigger in the chrome reads as one control. The body is the
 * shared {@link HelpMenuItems}.
 */
export function HomeHelpMenu({
  variant = "home",
  className,
  color,
}: {
  variant?: HelpMenuVariant
  className?: string
  /** Pins an explicit foreground (the themed mobile overflow menu). */
  color?: string
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id="help-menu-button"
        render={
          <Button
            variant="ghost"
            size="sm"
            className={navbarButtonStyle(className)}
            style={color ? { color } : undefined}
          />
        }
      >
        <span>Help</span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-labelledby="help-menu-button">
        <HelpMenuItems variant={variant} onSelect={close} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
