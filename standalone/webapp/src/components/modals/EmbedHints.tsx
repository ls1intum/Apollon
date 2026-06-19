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
 * Embed-hints panel for the share modal. Renders three copyable snippets for
 * the current diagram (the diagramId is the bearer — no token, no role gate):
 *
 *   1. Markdown image with click-through: `[![title](preview.svg)](editor)`
 *   2. Plain Markdown image (no click-through).
 *   3. HTML iframe pointing at the `/embed/:id` page.
 *
 * Only SERVER-persisted diagrams render: `/shared/:id` (and legacy `/:id`).
 * A `/local/:id` diagram is a client-only IndexedDB id the server can't render,
 * so the panel shows a save-first hint instead of emitting 404-bound snippets.
 */
export function EmbedHints({ title = "Apollon diagram" }: { title?: string }) {
  const diagramId = useEmbeddableDiagramId()
  const snippets = diagramId ? buildSnippets(diagramId, title) : null

  if (!snippets) {
    return (
      <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl">
        <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
          Embed in GitHub / GitLab
        </legend>
        <Typography>
          Save the diagram first, then return here for a copyable embed snippet.
        </Typography>
      </fieldset>
    )
  }

  return (
    <fieldset className="border border-[var(--home-border-subtle)] p-2 rounded-xl flex flex-col gap-3">
      <legend className="text-sm px-2 text-[var(--apollon-primary-contrast)]">
        Embed in GitHub / GitLab
      </legend>
      <SnippetRow
        label="Markdown (clickable image)"
        value={snippets.markdownLinked}
        hint="Recommended for GitHub README / issue / PR. Renders the diagram inline; clicking it opens the full editor."
      />
      <SnippetRow
        label="Markdown (image only)"
        value={snippets.markdownPlain}
        hint="When you don't want a click-through link."
      />
      <SnippetRow
        label="HTML iframe"
        value={snippets.iframe}
        hint="For renderers that allow iframes (GitLab Pages, Notion, Confluence, VS Code preview)."
      />
    </fieldset>
  )
}

/**
 * Builds the three snippets, or `null` when there is no externally-resolvable
 * server origin (native without a configured API host). The SVG + `/embed`
 * routes live on the API host; the click-through uses `buildSharedDiagramUrl`
 * so it always lands on the canonical `/shared/:id` route.
 */
function buildSnippets(diagramId: string, title: string) {
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
    markdownLinked: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
    markdownPlain: `![${safeTitle}](${previewUrl})`,
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

interface SnippetRowProps {
  label: string
  value: string
  hint: string
}

function SnippetRow({ label, value, hint }: SnippetRowProps) {
  const onCopy = () => {
    void copyToClipboard(value).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Could not copy to clipboard")
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs font-semibold text-[var(--apollon-primary-contrast)]">
          {label}
        </span>
        <span className="text-xs opacity-60 text-[var(--apollon-primary-contrast)]">
          {hint}
        </span>
      </div>
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          readOnly
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className="grow h-[36px] px-3 py-1.5 border rounded-md border-r-0 rounded-r-none border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)] text-xs font-mono"
        />
        <Button
          onClick={onCopy}
          variant="outline"
          aria-label={`Copy ${label}`}
          className="rounded-l-none h-[36px]"
        >
          Copy
        </Button>
      </div>
    </div>
  )
}
