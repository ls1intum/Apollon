import {
  type AnchorHTMLAttributes,
  type ImgHTMLAttributes,
  useEffect,
  useState,
} from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Alert, AlertDescription } from "@tumaet/ui/components/alert"
import { environment } from "@/environment"
import {
  isSafeLegalHref,
  isSafeLegalImageSrc,
  type LegalPageId,
  type ResolvedLegalContent,
  resolveLegalContent,
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
  /** Injected for tests. Production callers pass nothing. */
  resolver?: typeof resolveLegalContent
  /** Profile override for tests. Production reads environment.legal.profile. */
  profileOverride?: string
}

export function LegalPage({
  page,
  title,
  resolver = resolveLegalContent,
  profileOverride,
}: LegalPageProps) {
  const [resolved, setResolved] = useState<ResolvedLegalContent | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const profile = profileOverride ?? environment.legal.profile

  useEffect(() => {
    const controller = new AbortController()
    // Clear stale content synchronously when the page/profile changes so the
    // loading state shows immediately before the resolver resolves.
    setError(null)
    setResolved(null)
    resolver(page, { signal: controller.signal, profile })
      .then((next) => {
        if (controller.signal.aborted) return
        setResolved(next)
        if (next.source === "disclaimer") {
          // Shipping the disclaimer in production violates § 5 DDG and Art. 13
          // GDPR. The on-page banner alone is not enough because operators
          // rarely open the page themselves.
          console.warn(
            `[legal] Disclaimer fallback served for page=${page}. Configure LEGAL_PROFILE or mount /legal-overrides/. See docs/admin/legal-pages.`
          )
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return
        setError(
          err instanceof Error ? err : new Error("Failed to load legal content")
        )
      })
    return () => controller.abort()
  }, [page, profile, resolver])

  return (
    <div className="home-canvas-bg h-full overflow-hidden bg-background text-foreground">
      <main className="home-page-scrollbar app-scroll-y">
        <div className="home-content-x mx-auto w-full max-w-3xl pt-5 md:pt-6">
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
      </main>
    </div>
  )
}
