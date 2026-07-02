import { Skeleton } from "@tumaet/ui/components/skeleton"
import { HistoryIcon, BookmarkIcon } from "lucide-react"
import { useEffect, useRef, useState, type FC } from "react"
import { ApollonEditor, importDiagram, type UMLModel } from "@tumaet/apollon"
import { getVersionRepository } from "@/services/versionRepository"
import { log } from "@/logger"

/**
 * Per-version SVG thumbnail. The body JSON is fetched lazily when the row
 * enters the viewport (`IntersectionObserver`) and rendered client-side via
 * `ApollonEditor.exportModelAsSvg`. Result is data-URL'd and stamped into
 * an `<img>` so the browser handles `object-fit: contain` framing for free.
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
  /**
   * Thumbnail size (one bounded axis): `"compact"` is the small list-row tile
   * (64x40); `"banner"` (default) is the larger compare-banner size (160x100).
   */
  size?: "compact" | "banner"
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
  size = "banner",
  isAuto = false,
}) => {
  const compact = size === "compact"
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

  const KindIcon = isAuto ? HistoryIcon : BookmarkIcon
  const w = compact ? 64 : 160
  const h = compact ? 40 : 100

  return (
    <div
      ref={ref}
      // Fixed light plate — the library exports diagrams with concrete
      // dark stroke/text colors regardless of host theme, so a white
      // backdrop keeps thumbnails legible in light and dark mode.
      className="flex shrink-0 items-center justify-center overflow-hidden rounded bg-white"
      style={{
        width: w,
        height: h,
        color: isAuto ? "var(--home-text-muted)" : "var(--home-accent-base)",
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
        <KindIcon className={compact ? "size-4" : "size-6"} aria-hidden />
      ) : (
        <Skeleton className="rounded-none" style={{ width: w, height: h }} />
      )}
    </div>
  )
}
