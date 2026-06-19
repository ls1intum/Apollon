import { useId, useState } from "react"
import { useLocation } from "@tanstack/react-router"
import { toast } from "react-toastify"
import { Typography } from "@/components/Typography"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/utils/clipboard"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import {
  buildSharedDiagramUrl,
  resolveServerOrigin,
} from "@/utils/sharedDiagramLinks"

/**
 * Embed panel for the share modal: copy one snippet to drop a *live* diagram
 * (it re-renders as you edit) into a README, docs page, or any site. The
 * snippet works in any Markdown renderer, any `<img>`, and any iframe host —
 * so the panel is platform-neutral; specific platforms only appear as examples
 * in the per-format hint.
 *
 * One snippet is shown at a time, picked with a format selector (clickable
 * Markdown by default), following the Loom/Observable/Gist convention rather
 * than dumping every variant at once. Only SERVER-persisted diagrams embed
 * (`/shared/:id`, legacy `/:id`); a `/local/:id` is a client-only id the server
 * can't render, so the panel shows a share-first hint instead.
 */

type EmbedFormat = "markdown" | "markdown-plain" | "iframe"

const FORMATS: ReadonlyArray<{
  id: EmbedFormat
  label: string
  hint: string
}> = [
  {
    id: "markdown",
    label: "Markdown",
    hint: "Recommended. Renders inline; clicking it opens the diagram in the editor.",
  },
  {
    id: "markdown-plain",
    label: "Markdown (no link)",
    hint: "The same image, without the click-through.",
  },
  {
    id: "iframe",
    label: "iframe",
    hint: "For pages that allow iframes — Notion, Confluence, GitLab Pages, or your own site.",
  },
]

export function EmbedHints({ title = "Apollon diagram" }: { title?: string }) {
  const diagramId = useEmbeddableDiagramId()
  const [format, setFormat] = useState<EmbedFormat>("markdown")
  const hintId = useId()
  const snippets = diagramId ? buildSnippets(diagramId, title) : null

  if (!snippets) {
    return (
      <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl">
        <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
          Embed
        </legend>
        <Typography sx={{ fontSize: "0.875rem", opacity: 0.75 }}>
          Share this diagram to embed it — your snippet will appear here.
        </Typography>
      </fieldset>
    )
  }

  const active = FORMATS.find((f) => f.id === format) ?? FORMATS[0]
  const value = snippets[format]

  const onCopy = () => {
    void copyToClipboard(value).then(
      () => toast.success("Embed snippet copied"),
      () => toast.error("Couldn't copy. Select the text and copy manually.")
    )
  }

  return (
    <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl flex flex-col gap-2">
      <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
        Embed
      </legend>
      <Typography sx={{ fontSize: "0.8125rem", opacity: 0.75 }}>
        Add a live diagram to your README, docs, or any web page — it stays in
        sync as you edit.
      </Typography>

      <div
        role="group"
        aria-label="Embed format"
        className="flex flex-wrap gap-1"
      >
        {FORMATS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={f.id === format ? "secondary" : "ghost"}
            aria-pressed={f.id === format}
            onClick={() => setFormat(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center">
        <input
          type="text"
          value={value}
          readOnly
          aria-label={`Embed snippet (${active.label})`}
          aria-describedby={hintId}
          onFocus={(e) => e.currentTarget.select()}
          className="grow h-[36px] px-3 py-1.5 border rounded-md border-r-0 rounded-r-none border-[var(--home-border-default)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)] text-xs font-mono"
        />
        <Button
          onClick={onCopy}
          variant="outline"
          aria-label="Copy embed snippet"
          className="rounded-l-none h-[36px]"
        >
          Copy
        </Button>
      </div>
      <span
        id={hintId}
        className="text-xs opacity-70 text-[var(--apollon-primary-contrast)]"
      >
        {active.hint}
      </span>
    </fieldset>
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
  // Collapse whitespace and drop the characters that break Markdown alt text.
  const safeTitle =
    title
      .replace(/\s+/g, " ")
      .replace(/[[\]()]/g, "")
      .trim() || "Apollon diagram"
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
