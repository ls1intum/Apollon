import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { useModalContext } from "@/contexts"
import { bugReportURL } from "@/constants/urls"
import { releasesLink, repositoryLink } from "@/constants/version"
import { readNavFrom } from "@/lib/navProvenance"
import { cn } from "@tumaet/ui/lib/utils"

const itemClass =
  "rounded-sm text-muted-foreground transition-colors duration-200 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"

/**
 * The home help/legal links (About, Releases, GitHub, Privacy, Imprint, Report).
 * Legal links must stay reachable and not buried, so they render inline — as a
 * single footer bar on the web and inside a menu on mobile/native (where a
 * persistent footer is out of place and collides with the safe area).
 */
const HelpLinks = ({ onSelect }: { onSelect?: () => void }) => {
  const { openModal } = useModalContext()
  // Forward the INHERITED origin (set when arriving from the editor), not the
  // current /imprint path — so an imprint → privacy hop still returns the user
  // to their diagram rather than to /imprint.
  const from = readNavFrom(useLocation().state)
  const legalLinkState = from ? { from } : undefined
  return (
    <>
      <button
        type="button"
        className={cn(itemClass, "text-left")}
        onClick={() => {
          openModal("AboutModal")
          onSelect?.()
        }}
      >
        About
      </button>
      <a
        href={releasesLink}
        target="_blank"
        rel="noreferrer"
        className={itemClass}
        onClick={onSelect}
      >
        Releases
      </a>
      <a
        href={repositoryLink}
        target="_blank"
        rel="noreferrer"
        className={itemClass}
        onClick={onSelect}
      >
        GitHub
      </a>
      <Link
        to="/privacy"
        state={legalLinkState}
        className={itemClass}
        onClick={onSelect}
      >
        Privacy
      </Link>
      <Link
        to="/imprint"
        state={legalLinkState}
        className={itemClass}
        onClick={onSelect}
      >
        Imprint
      </Link>
      <a
        href={bugReportURL}
        target="_blank"
        rel="noreferrer"
        className={itemClass}
        onClick={onSelect}
      >
        Report a problem
      </a>
    </>
  )
}

/** Slim, single-line footer bar — web/desktop. */
export const HomeFooter = ({ className }: { className?: string }) => (
  <footer
    aria-label="Help and legal"
    className={cn(
      "z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-border-subtle bg-background px-4 py-2.5 text-xs",
      className
    )}
  >
    <HelpLinks />
  </footer>
)

/** Overflow menu for the same links — mobile and native, where a footer bar is
 * non-native. Lightweight (no MUI) to keep it off the home first-paint cost. */
export const HomeHelpMenu = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Help and legal"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--apollon-chrome-text-muted)] transition-colors hover:bg-[var(--apollon-chrome-surface-hover)] hover:text-[color:var(--apollon-chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--apollon-chrome-accent)]"
      >
        <MoreIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 flex min-w-44 flex-col items-start gap-2 rounded-md border border-border bg-card p-3 text-sm shadow-sm"
        >
          <HelpLinks onSelect={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

const MoreIcon = (): ReactNode => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)
