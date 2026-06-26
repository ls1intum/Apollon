import { useState } from "react"
import { ChevronDownIcon, CircleHelpIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@tumaet/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { useMediaQuery } from "@/hooks"
import { bugReportURL } from "@/constants/urls"
import { releasesLink, repositoryLink } from "@/constants/version"
import {
  navbarButtonStyle,
  CHROME_REVEAL,
  type ChromeReveal,
} from "@/components/navbar/styleConstants"
import { useHelpMenu } from "./useHelpMenu"

/**
 * The SINGLE Help/legal menu source for the WHOLE app — home band, home mobile
 * overflow, the chrome sub-route header, AND the editor (desktop + mobile
 * overflow). Both the home and the editor Help controls render the SAME
 * {@link HelpMenuItems} body, so the item SET, ORDER, labels, surface, and a11y
 * are identical everywhere and can never drift.
 *
 * Item order (shared tail): About → Releases → GitHub → Report a problem,
 * separator, then the legal links Imprint → Privacy. The `editor` variant adds
 * the editor-only entries around that tail — "How does this Editor Work?" leads,
 * and (in DEV builds only) "Open Playground" sits just before the legal
 * separator — without forking the surface or the shared items.
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
  // Impure wiring (modal opening + router-derived legal provenance) lives in the
  // hook; the item rendering below stays pure relative to its outputs.
  const { legalLinkState, openHowToUse, openAbout } = useHelpMenu(variant)

  return (
    <>
      {variant === "editor" && (
        <DropdownMenuItem
          onClick={() => {
            openHowToUse()
            onSelect()
          }}
        >
          How does this Editor Work?
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => {
          openAbout()
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
      {variant === "editor" && import.meta.env.DEV && (
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
          <Link to="/imprint" state={legalLinkState} onClick={onSelect}>
            Imprint
          </Link>
        }
      />
      <DropdownMenuItem
        render={
          <Link to="/privacy" state={legalLinkState} onClick={onSelect}>
            Privacy
          </Link>
        }
      />
    </>
  )
}

/**
 * The Help dropdown: the standardized trigger shared with the editor's File menu
 * — a shadcn `Button variant="ghost" size="sm"` wearing `navbarButtonStyle()`
 * (via `render=`) with a leading question-mark glyph, a label that reveals at the
 * surface's breakpoint, and a trailing `ChevronDownIcon` — so every chrome menu
 * trigger reads as one control. When the label is hidden the shared `Tooltip`
 * names it (disabled once the label shows). `reveal` selects the per-surface
 * label breakpoint (editor band `lg`, home band `wide`, sub-route `always`). The
 * body is the shared {@link HelpMenuItems}.
 */
export function HomeHelpMenu({
  variant = "home",
  className,
  color,
  reveal = "lg",
}: {
  variant?: HelpMenuVariant
  className?: string
  /** Pins an explicit foreground (the themed mobile overflow menu). */
  color?: string
  reveal?: ChromeReveal
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { labelClass, mq } = CHROME_REVEAL[reveal]
  const labelled = useMediaQuery(mq)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip disabled={labelled}>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              id="help-menu-button"
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={navbarButtonStyle(className)}
                  style={color ? { color } : undefined}
                  aria-label="Help"
                />
              }
            >
              <CircleHelpIcon className="size-4" aria-hidden />
              <span className={labelClass}>Help</span>
              <ChevronDownIcon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>Help</TooltipContent>
      </Tooltip>
      <DropdownMenuContent aria-labelledby="help-menu-button">
        <HelpMenuItems variant={variant} onSelect={close} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
