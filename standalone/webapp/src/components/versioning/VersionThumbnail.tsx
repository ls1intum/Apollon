import { Box, Skeleton } from "@mui/material"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded"
import { useEffect, useRef, useState, type FC } from "react"
import {
  ApollonEditor,
  importDiagram,
  type UMLModel,
} from "@tumaet/apollon/react"
import { getVersionRepository } from "@/services/versionRepository"
import { log } from "@/logger"

/**
 * Per-version SVG thumbnail. The body JSON is fetched lazily when the row
 * enters the viewport (`IntersectionObserver`) and rendered client-side via
 * `ApollonEditor.exportModelAsSvg`. Result is data-URL'd and stamped into
 * an `<img>` so the browser handles `object-fit: contain` framing for free.
 *
 * Why not server-side render? The previous implementation hit a server
 * endpoint that booted JSDOM + the full library bundle on every cold call,
 * cost a network round-trip per thumbnail, and didn't exist in local mode.
 * Snapshots are immutable JSON and the library can render in-browser — the
 * server's job here was a wasted boundary.
 *
 * Concurrency note: `exportModelAsSvg` mounts a temporary 4000x4000 div
 * during rendering, so we serialize via a tiny module-level queue to avoid
 * stacking many of those at once. With viewport-gated lazy loading the
 * burst size is naturally bounded (visible rows only) but the mutex keeps
 * us safe on long lists during fast scrolling.
 */

// Module-level cache: snapshots are immutable, so a permanent in-memory
// data URL is correct. Cleared on full reload.
const cache = new Map<string, string>() // key = `${diagramId}/${versionId}`

// Single-flight render queue. Prevents overlapping `exportModelAsSvg`
// calls from racing on the shared temp DOM container.
let renderQueue: Promise<unknown> = Promise.resolve()
function enqueueRender<T>(fn: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(fn, fn)
  // Don't let a rejected render poison the chain for the next thumbnail.
  renderQueue = next.catch(() => {})
  return next
}

interface Props {
  diagramId: string
  versionId: string
  /** When true, render the small list-row variant; otherwise compare-banner size. */
  compact?: boolean
  isAuto?: boolean
}

function svgToDataUrl(svgText: string): string {
  const bytes = new TextEncoder().encode(svgText)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

export const VersionThumbnail: FC<Props> = ({
  diagramId,
  versionId,
  compact = true,
  isAuto = false,
}) => {
  const cacheKey = `${diagramId}/${versionId}`
  const [src, setSrc] = useState<string | null>(cache.get(cacheKey) ?? null)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (src || errored) return
    const node = ref.current
    if (!node) return
    let cancelled = false
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        observer.disconnect()
        getVersionRepository()
          .getBody(diagramId, versionId)
          .then((body) => {
            if (cancelled) return null
            // `Diagram` (server wire form) is `UMLModel & {...}`; route
            // through `importDiagram` so older-schema snapshots forward-
            // convert to whatever the current library understands before
            // rendering.
            const model = importDiagram(body) as UMLModel
            return enqueueRender(() =>
              ApollonEditor.exportModelAsSvg(model, { svgMode: "compat" })
            )
          })
          .then((result) => {
            if (cancelled || !result) return
            const url = svgToDataUrl(result.svg)
            cache.set(cacheKey, url)
            setSrc(url)
          })
          .catch((err) => {
            if (cancelled) return
            log.error("Thumbnail render failed", err)
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
  }, [diagramId, versionId, src, errored])

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
        // Fixed light plate — the library exports diagrams with concrete
        // dark stroke/text colors regardless of host theme, so a white
        // backdrop keeps thumbnails legible in light and dark mode.
        bgcolor: "#ffffff",
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isAuto ? "#9aa0a6" : "#1a73e8",
      }}
      aria-hidden
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            padding: "2px",
            boxSizing: "border-box",
          }}
        />
      ) : errored ? (
        <KindIcon fontSize={compact ? "small" : "medium"} aria-hidden />
      ) : (
        <Skeleton variant="rectangular" width={w} height={h} />
      )}
    </Box>
  )
}
