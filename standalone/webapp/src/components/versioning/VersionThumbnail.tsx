import { Box, Skeleton } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded"
import { useEffect, useMemo, useRef, useState, type FC } from "react"
import { serverURL } from "@/constants"

/**
 * Per-version SVG thumbnail. Lazily fetched when the row enters the
 * viewport via IntersectionObserver, then cached in a module-level Map
 * for the rest of the session. Snapshots are immutable, so a permanent
 * in-memory cache is correct (the browser HTTP cache also pins them via
 * the server's `Cache-Control: immutable` header).
 *
 * Falls back to a kind icon on error or while loading.
 *
 * The fetched SVG is rewritten so it (a) preserves its aspect ratio and
 * centres in the thumbnail viewport (`preserveAspectRatio="xMidYMid meet"`),
 * (b) uses `width="100%"` `height="100%"` instead of any fixed size from
 * the original render, and (c) drops any explicit `background` so the
 * thumbnail picks up the surrounding theme background (works in both
 * light and dark mode).
 */

const cache = new Map<string, string>() // key = `${diagramId}/${versionId}`

interface Props {
  diagramId: string
  versionId: string
  /** When true, render the small list-row variant; otherwise compare-banner size. */
  compact?: boolean
  isAuto?: boolean
}

function normaliseSvgForThumbnail(svgText: string): string {
  // Drop any width/height attributes on the root <svg> and force the SVG
  // to scale + centre via preserveAspectRatio. Cheap regex — server output
  // is well-formed, no untrusted XML parsing needed.
  return svgText
    .replace(/<svg([^>]*)\swidth="[^"]*"/i, "<svg$1")
    .replace(/<svg([^>]*)\sheight="[^"]*"/i, "<svg$1")
    .replace(
      /<svg([^>]*?)>/i,
      `<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
    )
}

export const VersionThumbnail: FC<Props> = ({
  diagramId,
  versionId,
  compact = true,
  isAuto = false,
}) => {
  const cacheKey = `${diagramId}/${versionId}`
  const [svg, setSvg] = useState<string | null>(cache.get(cacheKey) ?? null)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (svg || errored) return
    const node = ref.current
    if (!node) return
    let cancelled = false
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        observer.disconnect()
        fetch(
          `${serverURL}/api/diagrams/${diagramId}/versions/${versionId}?type=svg`,
          { credentials: "include" }
        )
          .then((res) => {
            if (!res.ok) throw new Error(`status ${res.status}`)
            return res.text()
          })
          .then((text) => {
            if (cancelled) return
            const normalised = normaliseSvgForThumbnail(text)
            cache.set(cacheKey, normalised)
            setSvg(normalised)
          })
          .catch(() => {
            if (cancelled) return
            setErrored(true)
          })
      },
      { rootMargin: "100px", threshold: 0.01 }
    )
    observer.observe(node)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [diagramId, versionId, cacheKey, svg, errored])

  const KindIcon = isAuto ? HistoryRoundedIcon : BookmarkRoundedIcon
  const w = compact ? 64 : 160
  const h = compact ? 40 : 100

  // Memoise the SVG markup so React's diff doesn't re-write
  // dangerouslySetInnerHTML on unrelated re-renders.
  const inner = useMemo(() => (svg ? { __html: svg } : undefined), [svg])

  return (
    <Box
      ref={ref}
      sx={{
        width: w,
        height: h,
        flexShrink: 0,
        // Theme-aware background so thumbnails sit cleanly against both
        // light and dark sidebars. `action.hover` is the same token MUI
        // uses for selected list rows — visually quiet in both modes.
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Icon fallback colour — picks up the theme palette.
        color: isAuto ? "text.secondary" : "primary.main",
      }}
      aria-hidden
    >
      {inner ? (
        <Box
          // Centred inner box for the SVG. preserveAspectRatio in the SVG
          // itself does the visual centring; the wrapper just sizes it.
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& > svg": { width: "100%", height: "100%", display: "block" },
          }}
          dangerouslySetInnerHTML={inner}
        />
      ) : errored ? (
        <KindIcon fontSize={compact ? "small" : "medium"} aria-hidden />
      ) : (
        <Skeleton variant="rectangular" width={w} height={h} />
      )}
    </Box>
  )
}
