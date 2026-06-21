import { useId, useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/home/SegmentedControl"
import { copyToClipboard } from "@/utils/clipboard"
import { DiagramView } from "@/types"
import {
  buildSharedDiagramUrl,
  resolveServerOrigin,
} from "@/utils/sharedDiagramLinks"

/**
 * Embed panel for the share modal: copies one snippet that renders a *live*,
 * auto-updating diagram. `diagramId` is the server id of a shared diagram (the
 * caller resolves it — from the share it just created, or the current shared
 * route); without one, the panel shows a share-first hint.
 */

type EmbedFormat = "markdown" | "markdown-plain" | "iframe"

const FORMAT_OPTIONS = [
  { value: "markdown", label: "Markdown" },
  { value: "markdown-plain", label: "Markdown (no link)" },
  { value: "iframe", label: "iframe" },
] satisfies readonly SegmentedControlOption<EmbedFormat>[]

const FORMAT_HINTS: Record<EmbedFormat, string> = {
  markdown:
    "Recommended. A framed diagram with an “Open in Apollon” button — click it to open the editor.",
  "markdown-plain": "The same framed image, but not clickable.",
  iframe: "A live, interactive embed for sites that allow iframes.",
}

export function EmbedHints({
  diagramId,
  title = "Apollon diagram",
}: {
  diagramId?: string
  title?: string
}) {
  const [format, setFormat] = useState<EmbedFormat>("markdown")
  const hintId = useId()
  const snippets = diagramId ? buildSnippets(diagramId, title) : null

  const onCopy = (value: string) => {
    void copyToClipboard(value).then(
      () => toast.success("Embed code copied"),
      () => toast.error("Couldn't copy. Select the text and copy it manually.")
    )
  }

  return (
    <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl flex flex-col gap-2">
      <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
        Embed
      </legend>

      {!snippets ? (
        <p className="text-sm opacity-75 text-[var(--apollon-primary-contrast)]">
          Share the diagram to embed it.
        </p>
      ) : (
        <>
          <p className="text-sm opacity-75 text-[var(--apollon-primary-contrast)]">
            Add a live diagram to any page — it updates as you edit.
          </p>

          <SegmentedControl
            options={FORMAT_OPTIONS}
            value={format}
            onChange={setFormat}
          />

          <div className="relative min-w-0">
            <textarea
              value={snippets[format]}
              readOnly
              spellCheck={false}
              rows={Math.min(
                6,
                Math.max(2, snippets[format].split("\n").length)
              )}
              aria-label="Embed code"
              aria-describedby={hintId}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-y rounded-md border border-[var(--home-border-default)] bg-[var(--apollon-background)] px-3 py-2 pr-16 text-xs font-mono leading-relaxed text-[var(--apollon-primary-contrast)] outline-none"
            />
            <Button
              onClick={() => onCopy(snippets[format])}
              variant="outline"
              aria-label="Copy embed code"
              className="absolute right-2 top-2 h-7 px-2.5 text-xs"
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
 * The SVG, badge, and `/embed` routes live on the API host; the click-through
 * uses `buildSharedDiagramUrl` with an explicit `EDIT` view so "Open in Apollon"
 * always lands on the diagram regardless of the share dialog's default mode.
 */
function buildSnippets(
  diagramId: string,
  title: string
): Record<EmbedFormat, string> | null {
  const serverOrigin = resolveServerOrigin()
  if (!serverOrigin) return null
  const safeTitle = sanitizeMarkdownAlt(title)
  const id = encodeURIComponent(diagramId)
  const editorUrl = buildSharedDiagramUrl(diagramId, DiagramView.EDIT)
  const previewUrl = `${serverOrigin}/api/diagrams/${id}/preview.svg`
  const embedUrl = `${serverOrigin}/embed/${id}`
  return {
    // The framed preview image already carries the "Open in Apollon" button, so
    // one clickable image is the whole snippet — clicking it opens the editor.
    markdown: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
    "markdown-plain": `![${safeTitle}](${previewUrl})`,
    iframe: `<iframe src="${embedUrl}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" style="border:0;border-radius:8px"></iframe>`,
  }
}
