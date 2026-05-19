export type LegalPageId = "imprint" | "privacy"

export const LEGAL_PAGE_TITLES: Record<LegalPageId, string> = {
  imprint: "Imprint",
  privacy: "Privacy",
}

export interface ResolvedLegalContent {
  markdown: string
  source: "override" | "profile" | "disclaimer"
  profile: string
}

// Profile names land in a URL path on the webapp origin, so only the character
// class that matches on-disk profile directories is accepted. Anything else
// (whitespace, "..", "/", uppercase) falls through to the disclaimer exactly
// like an unset profile — the resolver never constructs an unexpected URL.
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/

export function isValidLegalProfile(profile: string): boolean {
  return PROFILE_PATTERN.test(profile)
}

// Restrict hyperlink + image protocols in operator-supplied markdown.
// javascript:, data:, vbscript: and unknown schemes are dropped at render time.
const SAFE_HREF_PATTERN = /^(?:https?:|mailto:|tel:|#|\/)/i
const SAFE_IMG_SRC_PATTERN = /^(?:https?:|\/)/i

export function isSafeLegalHref(href: unknown): href is string {
  return typeof href === "string" && SAFE_HREF_PATTERN.test(href)
}

export function isSafeLegalImageSrc(src: unknown): src is string {
  return typeof src === "string" && SAFE_IMG_SRC_PATTERN.test(src)
}

interface Candidate {
  url: string
  source: ResolvedLegalContent["source"]
}

function buildCandidates(page: LegalPageId, profile: string): Candidate[] {
  const candidates: Candidate[] = [
    { url: `/legal-overrides/${page}.md`, source: "override" },
  ]
  if (profile) {
    candidates.push({
      url: `/legal/profiles/${profile}/${page}.md`,
      source: "profile",
    })
  }
  candidates.push({
    url: `/legal/_disclaimer/${page}.md`,
    source: "disclaimer",
  })
  return candidates
}

async function tryFetch(
  url: string,
  signal?: AbortSignal
): Promise<string | null> {
  let response: Response
  try {
    response = await fetch(url, { signal, cache: "no-cache" })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    return null
  }
  if (!response.ok) return null
  // Defeat SPA fallbacks that served /index.html with a 200. nginx is
  // configured to 404 on missing legal files, but the client guard also
  // protects forks whose reverse proxy is not (yet) set up correctly.
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("text/html")) return null
  const body = await response.text()
  if (!body.trim()) return null
  if (body.trimStart().toLowerCase().startsWith("<!doctype html")) return null
  return body
}

export async function resolveLegalContent(
  page: LegalPageId,
  options: { signal?: AbortSignal; profile?: string } = {}
): Promise<ResolvedLegalContent> {
  const raw = (options.profile ?? "").trim()
  const profile = isValidLegalProfile(raw) ? raw : ""
  const candidates = buildCandidates(page, profile)
  for (const candidate of candidates) {
    const markdown = await tryFetch(candidate.url, options.signal)
    if (markdown !== null) {
      return { markdown, source: candidate.source, profile }
    }
  }
  throw new Error(`Unable to resolve legal content for page=${page}`)
}
