import { useId, useState } from "react"
import { useLocation } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { Typography } from "@/components/Typography"
import { Button } from "@/components/ui/button"
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/home/SegmentedControl"
import { copyToClipboard } from "@/utils/clipboard"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import {
  buildSharedDiagramUrl,
  resolveServerOrigin,
} from "@/utils/sharedDiagramLinks"

/**
 * Embed panel for the share modal: copies one snippet that renders a *live*,
 * auto-updating diagram. Only server-persisted diagrams embed (`/shared/:id`,
 * legacy `/:id`); a `/local/:id` is a client-only id the server can't render,
 * so the panel shows a share-first hint instead.
 */

type EmbedFormat = "markdown" | "markdown-plain" | "iframe"

const FORMAT_OPTIONS = [
  { value: "markdown", label: "Markdown" },
  { value: "markdown-plain", label: "Markdown (no link)" },
  { value: "iframe", label: "iframe" },
] satisfies readonly SegmentedControlOption<EmbedFormat>[]

const FORMAT_HINTS: Record<EmbedFormat, string> = {
  markdown:
    "Recommended. Shows the diagram inline; click it to open the editor.",
  "markdown-plain": "The same image, but not clickable.",
  iframe: "For sites that allow iframes, like Notion or your own page.",
}

export function EmbedHints({ title = "Apollon diagram" }: { title?: string }) {
  const diagramId = useEmbeddableDiagramId()
  const [format, setFormat] = useState<EmbedFormat>("markdown")
  const hintId = useId()
  const snippets = diagramId ? buildSnippets(diagramId, title) : null

  const onCopy = (value: string) => {
    void copyToClipboard(value).then(
      () => toast.success("Embed snippet copied"),
      () => toast.error("Couldn't copy. Select the text and copy it manually.")
    )
  }

  return (
    <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl flex flex-col gap-2">
      <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
        Embed
      </legend>

      {!snippets ? (
        <Typography sx={{ fontSize: "0.8125rem", opacity: 0.75 }}>
          Share this diagram first to get an embed snippet.
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: "0.8125rem", opacity: 0.75 }}>
            Add a live diagram to any page — it stays in sync as you edit.
          </Typography>

          <SegmentedControl
            options={FORMAT_OPTIONS}
            value={format}
            onChange={setFormat}
          />

          <div className="flex items-center">
            <input
              type="text"
              value={snippets[format]}
              readOnly
              aria-label="Embed snippet"
              aria-describedby={hintId}
              onFocus={(e) => e.currentTarget.select()}
              className="grow h-9 px-3 py-1.5 border rounded-md border-r-0 rounded-r-none border-[var(--home-border-default)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)] text-xs font-mono"
            />
            <Button
              onClick={() => onCopy(snippets[format])}
              variant="outline"
              aria-label="Copy embed snippet"
              className="rounded-l-none"
            >
              Copy
            </Button>
          </div>
          <span
            id={hintId}
            className="text-xs opacity-70 text-[var(--apollon-primary-contrast)]"
          >
            {FORMAT_HINTS[format]}
          </span>
        </>
      )}
    </fieldset>
  )
}

/**
 * Strips the characters that break Markdown alt text and collapses whitespace,
 * falling back to a default when the title is empty. Exported for unit tests.
 */
export function sanitizeMarkdownAlt(title: string): string {
  return (
    title
      .replace(/\s+/g, " ")
      .replace(/[[\]()]/g, "")
      .trim() || "Apollon diagram"
  )
}

/**
 * Builds the snippet for each format, or `null` when there is no
 * externally-resolvable server origin (native without a configured API host).
 * The SVG + `/embed` routes live on the API host; the click-through uses
 * `buildSharedDiagramUrl` so it always lands on the canonical `/shared/:id`.
 */
function buildSnippets(
  diagramId: string,
  title: string
): Record<EmbedFormat, string> | null {
  const serverOrigin = resolveServerOrigin()
  if (!serverOrigin) return null
  const safeTitle = sanitizeMarkdownAlt(title)
  const id = encodeURIComponent(diagramId)
  const editorUrl = buildSharedDiagramUrl(diagramId)
  const previewUrl = `${serverOrigin}/api/diagrams/${id}/preview.svg`
  const embedUrl = `${serverOrigin}/embed/${id}`
  return {
    markdown: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
    "markdown-plain": `![${safeTitle}](${previewUrl})`,
    iframe: `<iframe src="${embedUrl}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`,
  }
}

/**
 * The current diagramId only when it is server-renderable. Reuses the shared
 * path hook (which already excludes reserved pages and `/`), then drops the
 * `/local/:id` case — a client-only IndexedDB id the server can't render.
 */
function useEmbeddableDiagramId(): string | undefined {
  const id = useDiagramIdFromPath()
  const { pathname } = useLocation()
  const isLocal = pathname.split("/").filter(Boolean)[0] === "local"
  return isLocal ? undefined : id
}
