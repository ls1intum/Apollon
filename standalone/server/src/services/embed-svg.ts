/**
 * SVG sanitization for the embed surface.
 *
 * The library's `ApollonEditor.exportModelAsSvg` produces SVG via React's
 * server-render path, which already HTML-escapes user-controlled fields
 * (titles, labels). The patterns stripped below are defence-in-depth
 * against a future library regression: they target the exact node types
 * an attacker would need to land an XSS via SVG, and only those.
 *
 * If a richer sanitization story is ever required (e.g. user-pasted SVG
 * round-tripped through a diagram), swap this for `dompurify` in the
 * worker thread (which already has a JSDOM context).
 */

const STRIP_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // Inline scripts.
  { name: "script", re: /<script\b[\s\S]*?<\/script\s*>/gi },
  { name: "script-self-closing", re: /<script\b[^>]*\/>/gi },
  // foreignObject can mount arbitrary HTML, including <script>; strip.
  {
    name: "foreignObject",
    re: /<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi,
  },
  { name: "foreignObject-self-closing", re: /<foreignObject\b[^>]*\/>/gi },
  // Inline event-handler attributes (onclick, onload, …).
  { name: "on*-attr", re: /\son[a-z]+\s*=\s*"(?:\\.|[^"\\])*"/gi },
  { name: "on*-attr-single", re: /\son[a-z]+\s*=\s*'(?:\\.|[^'\\])*'/gi },
  { name: "on*-attr-bare", re: /\son[a-z]+\s*=\s*[^\s>]+/gi },
  // javascript: URI — the SVG <a> element honours these in some renderers.
  {
    name: "javascript-uri",
    re: /(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
  },
]

export interface SanitizeStats {
  hits: Record<string, number>
}

/**
 * Strips the patterns above and returns the cleaned SVG. The `stats`
 * field counts pattern hits for telemetry — non-zero hits in production
 * indicate an upstream library regression and should be alerted on.
 */
export function sanitizeSvg(svg: string): {
  svg: string
  stats: SanitizeStats
} {
  let cleaned = svg
  const hits: Record<string, number> = {}
  for (const { name, re } of STRIP_PATTERNS) {
    let count = 0
    cleaned = cleaned.replace(re, () => {
      count += 1
      return ""
    })
    if (count > 0) hits[name] = count
  }
  return { svg: cleaned, stats: { hits } }
}
