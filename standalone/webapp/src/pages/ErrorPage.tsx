import React from "react"
import { Link } from "@tanstack/react-router"
import { ChromeSubHeader } from "@/components/navbar/ChromeSubHeader"
import { PageShell } from "@/components/PageShell"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"

type ErrorPageProps = {
  title?: string
  message?: string
  buttonLabel?: string
  backPath?: string
  /**
   * Whether to render the sticky `ChromeSubHeader` island band. Default `true`
   * for the standalone 404 / `/$id` fallback. The editor-route "Diagram not
   * found" case (`ApollonLocal`) passes `false`: there the `EditorChromeHeader`
   * is already mounted by `__root`, so a second header would double up.
   */
  withChrome?: boolean
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Oops!",
  message = "Something went wrong.",
  // "Back to all diagrams" — NOT the header BackNav's "All diagrams". With the
  // chrome header now on the 404, an identical CTA label would produce two links
  // with the same accessible name ("All diagrams"), reading redundantly and
  // making `getByRole("link", {name})` ambiguous. The verb-led recovery CTA
  // stays distinct from the header's terse dashboard affordance.
  buttonLabel = "Back to all diagrams",
  backPath = "/",
  withChrome = true,
}) => {
  return (
    <PageShell
      header={withChrome ? <ChromeSubHeader title={title} /> : null}
      mainClassName="pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]"
    >
      {/* Center the message in the remaining space below the header, but inside
          a scroll container so a long error / 404 copy can still scroll to its
          end on a short viewport instead of being clipped. `min-h` reserves the
          header-less viewport height so short copy still reads centered. */}
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
        {/* The page's single <h1> lives in the sticky title island (see
            ChromeSubHeader). The body keeps the title as a LARGE DECORATIVE
            splash (a quiet display glyph, e.g. "404"), `aria-hidden` so it isn't
            a second heading and isn't read twice — the header h1 already names
            the page. The recovery message + CTA stay the meaningful content. */}
        <p
          aria-hidden
          className="text-5xl font-bold text-muted-foreground/70 select-none md:text-6xl"
        >
          {title}
        </p>
        <p className="mt-3 max-w-prose text-base text-muted-foreground">
          {message}
        </p>
        <Link
          to={backPath}
          className={navbarButtonStyle("apollon-chrome-accent-btn mt-4")}
        >
          {buttonLabel}
        </Link>
      </div>
    </PageShell>
  )
}
