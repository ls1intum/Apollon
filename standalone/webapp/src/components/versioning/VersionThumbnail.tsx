import { Skeleton } from "@tumaet/ui/components/skeleton"
import { HistoryIcon, BookmarkIcon } from "lucide-react"
import { useEffect, useRef, useState, type FC } from "react"
import { ApollonEditor, importDiagram, type UMLModel } from "@tumaet/apollon"
import { useVersionBodyQuery } from "@/queries/versionQueries"
import { useVersionRepositoryKind } from "@/contexts/VersionRepositoryContext"
import { log } from "@/logger"

/**
 * Per-version SVG thumbnail. The body JSON is fetched lazily when the row
 * enters the viewport: an `IntersectionObserver` flips the body query's
 * `enabled` gate, so off-screen rows never start a request and TanStack Query
 * owns caching/deduplication (the same cached body also serves preview entry
 * and the drawer's dirty-check baseline). Rendering happens client-side via
 * `ApollonEditor.exportModelAsSvg`; the result is data-URL'd and stamped into
 * an `<img>` so the browser handles `object-fit: contain` framing for free.
 *
 * Concurrency note: `exportModelAsSvg` mounts a temporary 4000x4000 div
 * during rendering, so we serialize via a tiny module-level queue to avoid
 * stacking many of those at once. With viewport-gated lazy loading the
 * burst size is naturally bounded (visible rows only) but the mutex keeps
 * us safe on long lists during fast scrolling.
 */

// Module-level cache for the RENDERED SVG (not the body — that's the query
// cache's job): snapshots are immutable, so a permanent in-memory data URL is
// correct. Cleared on full reload.
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
  const [renderFailed, setRenderFailed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Visibility gate: flips once when the row first scrolls near the viewport,
  // then disconnects — a version body is immutable, so there is nothing to
  // re-observe.
  useEffect(() => {
    if (src) return
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        observer.disconnect()
        setIsVisible(true)
      },
      { rootMargin: "100px", threshold: 0.01 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [src])

  const kind = useVersionRepositoryKind()
  const bodyQuery = useVersionBodyQuery(kind, diagramId, versionId, {
    enabled: isVisible && !src && !renderFailed,
  })

  // Body → SVG. The render queue serialises the expensive export; a
  // post-unmount `setSrc` is a React no-op, and the module cache write is
  // wanted either way, so no cancellation flag is needed.
  useEffect(() => {
    const body = bodyQuery.data
    if (!body || src || renderFailed) return
    enqueueRender(() => {
      // `Diagram` (server wire form) is `UMLModel & {...}`; route through
      // `importDiagram` so older-schema snapshots forward-convert to whatever
      // the current library understands before rendering. Inside the queue so
      // a schema failure flows into the same async error path as the export.
      const model = importDiagram(body) as UMLModel
      return ApollonEditor.exportModelAsSvg(model, { svgMode: "compat" })
    })
      .then((result) => {
        const url = svgToDataUrl(result.svg)
        cache.set(cacheKey, url)
        setSrc(url)
      })
      .catch((err) => {
        log.error("Thumbnail render failed", err)
        setRenderFailed(true)
      })
  }, [bodyQuery.data, src, renderFailed, cacheKey])

  const errored = renderFailed || bodyQuery.isError
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
