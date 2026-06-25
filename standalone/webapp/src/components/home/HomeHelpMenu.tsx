import { useState } from "react"
import { ChevronDownIcon, MoreHorizontal } from "lucide-react"
import { Link, useLocation } from "@tanstack/react-router"
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
 * The SHARED Help dropdown for the home chrome — the home's answer to the
 * editor's `NavbarHelp`, sharing its DropdownMenu grammar (trigger + the same
 * `text-sm` / padding / rounded-focus items) so the home band, the mobile
 * overflow pill, AND the sub-route header all read as one Help control.
 *
 * Item order mirrors the home footer's `HelpLinks`: About → Releases → GitHub →
 * Report a problem, a separator, then the legal links (Privacy, Imprint). The
 * legal `<Link>`s forward the INHERITED origin via `state={{ from }}` (the
 * `readNavFrom` provenance idiom) so an editor → legal hop still offers a real
 * "back to diagram".
 *
 * `iconOnly` swaps the "Help ▾" text trigger for a `…` icon button (the
 * `apollon-chrome-iconbtn` shell) for the mobile actions pill.
 */
export function HomeHelpMenu({
  iconOnly = false,
  className,
}: {
  iconOnly?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { openModal } = useModalContext()
  // Forward the inherited origin (set when arriving from the editor), not the
  // current /imprint path — so an imprint → privacy hop still returns the user
  // to their diagram rather than to /imprint.
  const from = readNavFrom(useLocation().state)
  const legalLinkState = from ? { from } : undefined
  const close = () => setOpen(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <DropdownMenuTrigger
          className={className ?? "apollon-chrome-iconbtn"}
          aria-label="Help"
          title="Help"
        >
          <MoreHorizontal className="size-[18px]" aria-hidden />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger className={navbarButtonStyle(className)}>
          <span>Help</span>
          <ChevronDownIcon className="ml-1 size-4" aria-hidden />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent aria-label="Help and legal">
        <DropdownMenuItem
          onClick={() => {
            openModal("AboutModal")
            close()
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
              onClick={close}
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
              onClick={close}
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
              onClick={close}
            >
              Report a problem
            </a>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link to="/privacy" state={legalLinkState} onClick={close}>
              Privacy
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link to="/imprint" state={legalLinkState} onClick={close}>
              Imprint
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
