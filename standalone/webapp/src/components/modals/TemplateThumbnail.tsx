import { useEffect, useState } from "react"
import { UMLDiagramType } from "@tumaet/apollon/react"
import { getDiagramTypeIcon } from "@/components/home/diagramTypeMeta"
import { getCachedThumbnailSources } from "@/utils/thumbnailTheme"
import { runWhenIdle } from "@/utils/idle"
import {
  getResolvedTemplateSvg,
  requestTemplateThumbnail,
  subscribeTemplateThumbnails,
} from "@/utils/templateThumbnails"

/**
 * Live preview of a design-pattern template inside the New Diagram dialog.
 * Renders the same stacked light/dark `<img>` pair the home cards use, so the
 * CSS `:root[data-theme]` swap handles theming with no JS theme listener. The
 * heavy render is queued lazily (see templateThumbnails) and memoized so the
 * dialog's name field re-renders don't rebuild it.
 */
export function TemplateThumbnail({ name }: { name: string }) {
  // undefined = still rendering, null = render failed, string = light SVG.
  const [lightSvg, setLightSvg] = useState<string | null | undefined>(() =>
    getResolvedTemplateSvg(name)
  )
  const [darkDataUrl, setDarkDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const resolved = getResolvedTemplateSvg(name)
    setLightSvg(resolved)
    if (resolved !== undefined) return

    // Unsubscribing on cleanup makes the setState unreachable after unmount.
    const unsubscribe = subscribeTemplateThumbnails((readyName, svg) => {
      if (readyName === name) {
        setLightSvg(svg)
      }
    })
    requestTemplateThumbnail(name)
    return unsubscribe
  }, [name])

  const cacheKey = `template:${name}`
  const lightDataUrl =
    typeof lightSvg === "string"
      ? (getCachedThumbnailSources(cacheKey, lightSvg)?.lightDataUrl ?? null)
      : null

  // Derive the dark variant off the main thread, exactly like DiagramCard.
  useEffect(() => {
    if (typeof lightSvg !== "string") {
      setDarkDataUrl(null)
      return
    }
    return runWhenIdle(() => {
      const sources = getCachedThumbnailSources(cacheKey, lightSvg, {
        eager: true,
      })
      if (sources) {
        setDarkDataUrl(sources.darkDataUrl)
      }
    })
  }, [cacheKey, lightSvg])

  return (
    <div className="relative h-[120px] w-full">
      {lightDataUrl ? (
        <>
          <img
            src={lightDataUrl}
            alt=""
            aria-hidden="true"
            className="theme-thumbnail-image theme-thumbnail-light"
            loading="lazy"
          />
          {darkDataUrl && (
            <img
              src={darkDataUrl}
              alt=""
              aria-hidden="true"
              className="theme-thumbnail-image theme-thumbnail-dark"
              loading="lazy"
            />
          )}
        </>
      ) : lightSvg === null ? (
        // Render failed — fall back to the type glyph so the tile is never blank.
        <div className="flex h-full w-full items-center justify-center text-[var(--home-text-secondary)]">
          {getDiagramTypeIcon(UMLDiagramType.ClassDiagram, "h-9 w-9")}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2"
            style={{
              borderColor: "var(--home-border-default)",
              borderTopColor: "var(--home-accent-base)",
            }}
          />
        </div>
      )}
    </div>
  )
}
