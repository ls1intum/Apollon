/**
 * Shared thumbnail theme helpers: turn a rendered diagram SVG into light/dark
 * `data:` URLs, with the dark variant derived by recoloring near-black strokes
 * and near-white fills so a diagram authored for the light canvas reads well on
 * a dark surface. Conversions are cached by an opaque key (LRU, capped) so the
 * expensive DOMParser walk only runs once per source.
 *
 * Consumers (home diagram cards, template previews) namespace their keys so
 * entries can never collide.
 */

type RgbColor = {
  r: number
  g: number
  b: number
  a: number
}

// Dark-thumbnail recolor targets come from the design tokens
// (--apollon-thumbnail-stroke / -fill in tokens.css), not hard-coded hex, so the
// light stroke + cool shape fill stay in lockstep with the rest of the palette
// and clear WCAG 1.4.11 non-text contrast on the dark card. The dark `data:` URL
// is generated once and shown via a CSS theme swap regardless of the live theme,
// so we must resolve the *dark-theme* token values specifically — done by
// reading them off a detached element forced to data-theme="dark", memoized.
const DARK_THEME_TOKEN_FALLBACK = {
  stroke: "#e4e4e1",
  fill: "#636e7e",
} as const

let darkThumbnailTokens: { stroke: string; fill: string } | null = null

const resolveDarkThumbnailTokens = (): { stroke: string; fill: string } => {
  if (darkThumbnailTokens) return darkThumbnailTokens

  if (typeof document === "undefined") {
    return DARK_THEME_TOKEN_FALLBACK
  }

  const probe = document.createElement("div")
  probe.setAttribute("data-theme", "dark")
  probe.style.display = "none"
  document.body.appendChild(probe)
  try {
    const styles = getComputedStyle(probe)
    const stroke = styles.getPropertyValue("--apollon-thumbnail-stroke").trim()
    const fill = styles.getPropertyValue("--apollon-thumbnail-fill").trim()
    darkThumbnailTokens = {
      stroke: stroke || DARK_THEME_TOKEN_FALLBACK.stroke,
      fill: fill || DARK_THEME_TOKEN_FALLBACK.fill,
    }
  } finally {
    probe.remove()
  }

  return darkThumbnailTokens
}

const THUMBNAIL_THEME_CACHE_LIMIT = 300

type ThumbnailThemeCacheEntry = {
  lightDataUrl?: string
  darkSvg?: string
  darkDataUrl?: string
}

export type ThumbnailThemeSources = {
  lightDataUrl: string
  darkDataUrl: string
}

// Cache expensive thumbnail theme conversions by an opaque caller-supplied key.
const thumbnailThemeCache = new Map<string, ThumbnailThemeCacheEntry>()

export const toSvgDataUrl = (svgString: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`

const parseCssColor = (value: string): RgbColor | null => {
  const normalized = value.trim().toLowerCase()
  if (
    normalized.length === 0 ||
    normalized === "none" ||
    normalized === "transparent" ||
    normalized === "currentcolor" ||
    normalized === "inherit" ||
    normalized.startsWith("url(")
  ) {
    return null
  }

  if (normalized === "black") {
    return { r: 0, g: 0, b: 0, a: 1 }
  }

  if (normalized === "white") {
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a = "f"] = hex
      return {
        r: Number.parseInt(r + r, 16),
        g: Number.parseInt(g + g, 16),
        b: Number.parseInt(b + b, 16),
        a: Number.parseInt(a + a, 16) / 255,
      }
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
      }
    }
    return null
  }

  const rgbaMatch = normalized.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/
  )
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      a: a ? Number(a) : 1,
    }
  }

  return null
}

const getColorLuminance = ({ r, g, b }: RgbColor): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b

const adaptSvgColorForDarkTheme = (
  value: string,
  role: "fill" | "stroke" | "color"
): string => {
  const parsedColor = parseCssColor(value)
  if (!parsedColor || parsedColor.a === 0) {
    return value
  }

  const luminance = getColorLuminance(parsedColor)
  const isNearBlack = luminance < 70
  const isNearWhite = luminance > 230

  const { stroke, fill } = resolveDarkThumbnailTokens()

  if (isNearBlack) {
    return stroke
  }

  if (role === "fill" && isNearWhite) {
    return fill
  }

  return value
}

export const applyDarkThemeToThumbnailSvg = (svgString: string): string => {
  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(svgString, "image/svg+xml")
  const parseError = parsedDocument.querySelector("parsererror")
  const svgElement = parsedDocument.documentElement

  if (parseError || !svgElement || svgElement.tagName.toLowerCase() !== "svg") {
    return svgString
  }

  const rewriteStyleAttribute = (styleValue: string) => {
    const declarations = styleValue
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)

    const rewritten = declarations.map((declaration) => {
      const separatorIndex = declaration.indexOf(":")
      if (separatorIndex < 0) return declaration
      const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
      const rawValue = declaration.slice(separatorIndex + 1).trim()

      if (
        property === "fill" ||
        property === "stroke" ||
        property === "color"
      ) {
        const nextValue = adaptSvgColorForDarkTheme(
          rawValue,
          property as "fill" | "stroke" | "color"
        )
        return `${property}:${nextValue}`
      }

      return declaration
    })

    return rewritten.join(";")
  }

  const nodes = svgElement.querySelectorAll("*")
  for (const node of nodes) {
    const fill = node.getAttribute("fill")
    if (fill) {
      node.setAttribute("fill", adaptSvgColorForDarkTheme(fill, "fill"))
    }

    const stroke = node.getAttribute("stroke")
    if (stroke) {
      node.setAttribute("stroke", adaptSvgColorForDarkTheme(stroke, "stroke"))
    }

    const color = node.getAttribute("color")
    if (color) {
      node.setAttribute("color", adaptSvgColorForDarkTheme(color, "color"))
    }

    const style = node.getAttribute("style")
    if (style) {
      node.setAttribute("style", rewriteStyleAttribute(style))
    }
  }

  return new XMLSerializer().serializeToString(svgElement)
}

const pruneThumbnailThemeCache = () => {
  while (thumbnailThemeCache.size > THUMBNAIL_THEME_CACHE_LIMIT) {
    const oldestKey = thumbnailThemeCache.keys().next().value
    if (!oldestKey) {
      break
    }
    thumbnailThemeCache.delete(oldestKey)
  }
}

export const getCachedThumbnailSources = (
  cacheKey: string,
  svgString: string | null,
  { eager = false } = {}
): ThumbnailThemeSources | null => {
  if (!svgString) return null

  let cacheEntry = thumbnailThemeCache.get(cacheKey)
  if (!cacheEntry) {
    pruneThumbnailThemeCache()
    cacheEntry = {}
    thumbnailThemeCache.set(cacheKey, cacheEntry)
  }

  // Keep recently used entries hot in insertion-order map.
  thumbnailThemeCache.delete(cacheKey)
  thumbnailThemeCache.set(cacheKey, cacheEntry)

  if (!cacheEntry.lightDataUrl) {
    cacheEntry.lightDataUrl = toSvgDataUrl(svgString)
  }

  // Dark-theme conversion is expensive (DOMParser + DOM walk + XMLSerializer).
  // Skip it during render; only run it eagerly when called from an idle callback.
  if (eager) {
    if (!cacheEntry.darkSvg) {
      cacheEntry.darkSvg = applyDarkThemeToThumbnailSvg(svgString)
    }
    if (!cacheEntry.darkDataUrl) {
      cacheEntry.darkDataUrl = toSvgDataUrl(cacheEntry.darkSvg)
    }
  }

  return {
    lightDataUrl: cacheEntry.lightDataUrl,
    darkDataUrl: cacheEntry.darkDataUrl ?? cacheEntry.lightDataUrl,
  }
}
