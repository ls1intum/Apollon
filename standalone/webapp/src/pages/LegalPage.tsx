import {
  type AnchorHTMLAttributes,
  type ImgHTMLAttributes,
  useEffect,
} from "react"
import { useQuery } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Alert, AlertDescription } from "@tumaet/ui/components/alert"
import { ChromeSubHeader } from "@/components/navbar/ChromeSubHeader"
import { PageShell } from "@/components/PageShell"
import { environment } from "@/environment"
import {
  getLegalResolver,
  isSafeLegalHref,
  isSafeLegalImageSrc,
  type LegalPageId,
} from "@/lib/legal"

const DISCLAIMER_BANNER =
  "This deployment has not been configured with a legal profile. The content below is a placeholder and does not identify the operator of this instance."

const ERROR_COPY = "Unable to load legal content."

// Operator-supplied Markdown is untrusted from the renderer's point of view.
// react-markdown v10 escapes raw HTML by default (no allowDangerousHtml, no
// rehype-raw), so <script>, <iframe>, and on* handlers never reach the DOM.
// We still override `a` and `img` to enforce a protocol allow-list —
// javascript:, data:, vbscript: and unknown schemes are silently dropped.
// Authored `title` attributes are a UI-spoof vector and are stripped.
function SafeAnchor({
  href,
  children,
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!isSafeLegalHref(href)) {
    return <span>{children}</span>
  }
  const isExternal = /^https?:/i.test(href)
  return (
    <a
      href={href}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {children}
    </a>
  )
}

function SafeImage({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) {
  if (!isSafeLegalImageSrc(src)) return null
  return <img src={src} alt={alt ?? ""} className="h-auto max-w-full" />
}

const MARKDOWN_COMPONENTS = { a: SafeAnchor, img: SafeImage }

export interface LegalPageProps {
  page: LegalPageId
  title: string
  /** Profile override for tests. Production reads environment.legal.profile. */
  profileOverride?: string
}

export function LegalPage({ page, title, profileOverride }: LegalPageProps) {
  const profile = profileOverride ?? environment.legal.profile

  // `retry: false` — the resolver already walks its own candidate chain
  // (override → profile → disclaimer), so a rejection here is terminal.
  const { data: resolved, error } = useQuery({
    queryKey: ["legal", page, profile],
    queryFn: ({ signal }) => getLegalResolver()(page, { signal, profile }),
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (resolved?.source !== "disclaimer") return
    // Shipping the disclaimer in production violates § 5 DDG and Art. 13
    // GDPR. The on-page banner alone is not enough because operators
    // rarely open the page themselves.
    console.warn(
      `[legal] Disclaimer fallback served for page=${page}. Configure LEGAL_PROFILE or mount /legal-overrides/. See docs/admin/legal-pages.`
    )
  }, [resolved, page])

  return (
    <PageShell
      header={<ChromeSubHeader />}
      // Legal prose wants a readable measure, not the home's full 1536px grid.
      contentClassName="max-w-3xl"
      // Pad the long copy past the bottom safe-area inset so the final line
      // clears a home indicator and isn't flush against the viewport edge.
      mainClassName="pb-[max(2.5rem,calc(var(--safe-area-inset-bottom,0px)+1.5rem))]"
    >
      {/* The page title is a real <h1> at the top of the content (not in the
          header band). mt-2 keeps the small gap the header band's pb-2 left
          between the band and the first content row. */}
      <div className="mt-2">
        <h1 className="mb-2 text-2xl font-semibold text-foreground md:text-3xl">
          {title}
        </h1>
        {resolved?.source === "disclaimer" ? (
          <Alert
            variant="destructive"
            data-testid="legal-disclaimer-banner"
            className="my-4"
          >
            <AlertDescription>{DISCLAIMER_BANNER}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="my-4">
            <AlertDescription>{ERROR_COPY}</AlertDescription>
          </Alert>
        ) : null}

        {resolved ? (
          <article
            lang="en"
            data-testid="legal-content"
            data-source={resolved.source}
            className="legal-content"
          >
            <ReactMarkdown
              skipHtml
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
            >
              {resolved.markdown}
            </ReactMarkdown>
          </article>
        ) : null}
      </div>
    </PageShell>
  )
}
