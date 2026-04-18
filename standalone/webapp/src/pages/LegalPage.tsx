import {
  type AnchorHTMLAttributes,
  type ImgHTMLAttributes,
  useEffect,
  useState,
} from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Alert, Box, Container, Link, Typography } from "@mui/material"
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
    <Link
      href={href}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {children}
    </Link>
  )
}

function SafeImage({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) {
  if (!isSafeLegalImageSrc(src)) return null
  return (
    <Box
      component="img"
      src={src}
      alt={alt ?? ""}
      sx={{ maxWidth: "100%", height: "auto" }}
    />
  )
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
          // eslint-disable-next-line no-console
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
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        bgcolor: "var(--apollon-background)",
        color: "var(--apollon-primary-contrast)",
      }}
    >
      <Container
        component="main"
        maxWidth="md"
        sx={{
          py: { xs: 3, md: 6 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            color: "var(--apollon-primary-contrast)",
            fontSize: { xs: "1.8rem", md: "2.5rem" },
          }}
        >
          {title}
        </Typography>

        {resolved?.source === "disclaimer" ? (
          <Alert
            severity="error"
            role="alert"
            data-testid="legal-disclaimer-banner"
            sx={{ my: 2 }}
          >
            {DISCLAIMER_BANNER}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" role="alert" sx={{ my: 2 }}>
            {ERROR_COPY}
          </Alert>
        ) : null}

        {resolved ? (
          <Box
            component="article"
            lang="en"
            data-testid="legal-content"
            data-source={resolved.source}
            sx={{
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              color: "var(--apollon-primary-contrast)",
              "& h1, & h2, & h3, & h4, & h5, & h6": {
                mt: 3,
                mb: 1,
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--apollon-primary-contrast)",
              },
              "& h2": { fontSize: { xs: "1.35rem", md: "1.5rem" } },
              "& h3": { fontSize: { xs: "1.15rem", md: "1.25rem" } },
              "& p, & ul, & ol": { mb: 2, lineHeight: 1.7 },
              "& ul": { pl: 3, listStyleType: "disc" },
              "& ol": { pl: 3, listStyleType: "decimal" },
              "& ul ul": { listStyleType: "circle", mb: 0 },
              "& ol ol": { listStyleType: "lower-alpha", mb: 0 },
              "& li": { mb: 0.5, display: "list-item" },
              "& li::marker": { color: "var(--apollon-primary-contrast)" },
              "& a": {
                color: "var(--apollon-primary)",
                textDecoration: "underline",
              },
              // Tables are authored by operators; on narrow screens let them
              // scroll horizontally rather than break the page layout.
              "& table": {
                display: "block",
                overflowX: "auto",
                borderCollapse: "collapse",
                width: "100%",
                my: 2,
                WebkitOverflowScrolling: "touch",
              },
              "& th, & td": {
                border: "1px solid var(--apollon-gray)",
                p: 1,
                textAlign: "left",
                verticalAlign: "top",
              },
              "& th": { bgcolor: "var(--apollon-background-variant)" },
              "& code": {
                bgcolor: "var(--apollon-background-variant)",
                px: 0.5,
                borderRadius: 0.5,
                fontSize: "0.95em",
                wordBreak: "break-all",
              },
              "& pre": {
                bgcolor: "var(--apollon-background-variant)",
                p: 2,
                borderRadius: 1,
                overflowX: "auto",
              },
              "& blockquote": {
                borderLeft: "4px solid var(--apollon-gray)",
                pl: 2,
                my: 2,
                color: "var(--apollon-gray)",
              },
              "& hr": {
                border: "none",
                borderTop: "1px solid var(--apollon-gray)",
                my: 3,
              },
            }}
          >
            <ReactMarkdown
              skipHtml
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
            >
              {resolved.markdown}
            </ReactMarkdown>
          </Box>
        ) : null}
      </Container>
    </Box>
  )
}
