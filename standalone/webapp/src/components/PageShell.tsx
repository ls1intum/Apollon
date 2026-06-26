import type { ReactNode } from "react"
import { cn } from "@tumaet/ui/lib/utils"

/**
 * The single page shell for every NON-EDITOR route (home, legal, 404). ONE
 * layout pattern for all three:
 *
 *   <div flex-col h-full min-h-0 overflow-hidden>        ← bounded flex column
 *     <div app-scroll-y flex-1 min-h-0>                  ← the ONE scroll viewport
 *       <div gutter max-w-1536 pt-5/6>                   ← shared header rhythm
 *         {header}                                       ← sticky banner row
 *         <main mx-auto contentClassName>{children}</main> ← page content
 *       </div>
 *     </div>
 *   </div>
 *
 * The outer wrapper must be a bounded flex column so the `app-scroll-y` scroll
 * viewport has a height to scroll against — otherwise legal copy past the first
 * viewport clips and can't scroll.
 *
 * Why the scroll root is a `<div>` and NOT a `<main>`: the header node
 * (`HomeHeaderRow` / `ChromeSubHeader`) contains a `<header role="banner">`
 * island, and the banner landmark must be top-level — axe's
 * `landmark-banner-is-top-level` forbids a banner nested inside another landmark.
 * So the scroll viewport is a plain `<div>`, and inside the shared gutter wrapper
 * the `{header}` (banner) and the `<main>` that wraps `{children}` are SIBLINGS —
 * both landmarks at the document root.
 *
 * The header + main share ONE gutter wrapper on purpose: a `sticky` element pins
 * only within its containing block, so this wrapper (which spans the full scroll
 * height) keeps the header pinned the whole way down — give the header its own
 * short wrapper and it un-sticks the moment you scroll past it. That wrapper
 * carries the SHARED rhythm — the `home-content-x` gutter, the 1536px max width
 * and the `pt-5/md:pt-6` resting offset — so the brand island lands at the
 * identical baseline and sticks identically on home and sub-pages.
 *
 * Content chooses its own measure via `contentClassName` (the home gallery fills
 * the 1536px column; legal prose re-centers in a readable `max-w-3xl`) — the
 * HEADER stays at 1536px regardless so the island position never shifts.
 */
export interface PageShellProps {
  /**
   * Sticky island header row — `HomeHeaderRow` on home, `ChromeSubHeader` on
   * sub-routes. It must be the sticky element itself; the shell supplies the
   * gutter / max-width / resting offset around it. It carries the page's
   * `<header role="banner">` island, which the shell keeps top-level (a sibling
   * of `<main>`, not nested inside it).
   */
  header: ReactNode
  /** Page body, laid out in the shared content gutter under the header. */
  children: ReactNode
  /**
   * Measure for the content column. Omit to fill the 1536px header column (the
   * home gallery); legal pages pass a narrower readable `max-w-3xl`.
   */
  contentClassName?: string
  /** Extra classes for the scroll viewport (e.g. the home FAB's `pb-24`). */
  mainClassName?: string
  /** Accessible name for the `<main>` content region, when one is warranted. */
  ariaLabel?: string
}

export function PageShell({
  header,
  children,
  contentClassName,
  mainClassName,
  ariaLabel,
}: PageShellProps) {
  return (
    <div className="home-canvas-bg relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* The scroll VIEWPORT is a plain `<div>`, NOT a landmark: the header it
          contains carries a `<header role="banner">`, and a banner landmark must
          be top-level (axe `landmark-banner-is-top-level`). Wrapping the whole
          scroll area in `<main>` would nest the banner inside `main`; instead the
          banner and `<main>` are siblings below (see the gutter wrapper). */}
      <div
        className={cn(
          "home-page-scrollbar app-scroll-y relative z-10 w-full min-h-0 flex-1",
          mainClassName
        )}
      >
        {/* ONE containing block for the header + body. This matters: a `sticky`
            element pins only within its containing block, so the header and the
            content MUST share this wrapper — it spans the full scroll height, so
            the header stays pinned the whole way down. (Giving the header its own
            short wrapper shrinks its containing block to its own height and it
            un-sticks the moment you scroll past it.) Shared rhythm: the
            `home-content-x` gutter, the 1536px max width, and the `pt-5/md:pt-6`
            resting offset the sticky header scrolls through before it pins —
            identical for home + legal + 404. */}
        <div className="home-content-x mx-auto w-full max-w-[1536px] pt-5 md:pt-6">
          {/* `{header}` (the sticky banner row) and `<main>` are SIBLINGS so the
              banner landmark stays top-level, not nested in `main`. Both still
              share this gutter wrapper, so the header keeps pinning the whole way
              down the scroll. */}
          {header}

          {/* Content measure is the page's to choose (the home gallery wants the
              full 1536px; legal prose wants a readable `max-w-3xl`). It re-centers
              within the 1536px header column; the header position never shifts. */}
          <main
            aria-label={ariaLabel}
            className={cn("mx-auto w-full", contentClassName)}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
