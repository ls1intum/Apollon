import { Box, Skeleton } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded"
import { useEffect, useRef, useState, type FC } from "react"
import { serverURL } from "@/constants"

/**
 * Per-version SVG thumbnail. Lazily fetched when the row enters the
 * viewport via IntersectionObserver, then cached in a module-level Map
 * for the rest of the session. Snapshots are immutable, so a permanent
 * in-memory cache is correct (the browser HTTP cache also pins them via
 * the server's `Cache-Control: immutable` header).
 *
 * Falls back to a kind icon on error or while loading.
 */

const cache = new Map<string, string>() // key = `${diagramId}/${versionId}`

interface Props {
  diagramId: string
  versionId: string
  /** When true, render the small list-row variant; otherwise compare-banner size. */
  compact?: boolean
  isAuto?: boolean
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
            cache.set(cacheKey, text)
            setSvg(text)
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

  return (
    <Box
      ref={ref}
      sx={{
        width: w,
        height: h,
        flexShrink: 0,
        bgcolor: "action.hover",
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isAuto ? "text.secondary" : "primary.main",
      }}
      aria-hidden
    >
      {svg ? (
        // Inline SVG via dangerouslySetInnerHTML — the server already
        // produced it from a typed model and we control the source. The
        // SVG is wrapped in a 100% × 100% sizing container.
        <Box
          sx={{
            width: "100%",
            height: "100%",
            "& svg": { width: "100%", height: "100%", display: "block" },
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : errored ? (
        <KindIcon fontSize={compact ? "small" : "medium"} aria-hidden />
      ) : (
        <Skeleton variant="rectangular" width={w} height={h} />
      )}
    </Box>
  )
}
