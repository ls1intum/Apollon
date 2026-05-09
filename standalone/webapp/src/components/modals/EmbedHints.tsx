import { useMemo } from "react"
import { useParams } from "react-router"
import { toast } from "react-toastify"
import { Typography } from "@/components/Typography"
import { APButton } from "../APButton"

/**
 * Embed-hints panel for the share modal.
 *
 * Renders three copyable snippets pointing at the *current* diagram's
 * URL (the diagramId is the bearer — there's no token, no role gate):
 *
 *   1. Markdown image-with-click-through, GitHub/GitLab README friendly:
 *        [![title](origin/api/diagrams/:id/preview.svg)](origin/:id)
 *      Renders inline; clicking opens the editor.
 *
 *   2. Plain markdown image (no click-through):
 *        ![title](origin/api/diagrams/:id/preview.svg)
 *
 *   3. HTML iframe for surfaces that allow it (GitLab Pages, Notion,
 *      Confluence, VS Code preview):
 *        <iframe src="origin/embed/:id" width="…" height="…" …></iframe>
 *
 * The component reads `diagramId` from the route params; if there is
 * no diagram in the URL (e.g. the user is on the local-only editor
 * `/`), the panel renders a one-line hint asking them to save first.
 */
export function EmbedHints({ title = "Apollon diagram" }: { title?: string }) {
  const { diagramId } = useParams<{ diagramId?: string }>()
  const origin = typeof window !== "undefined" ? window.location.origin : ""

  const snippets = useMemo(() => {
    if (!diagramId) return null
    const safeTitle = title.replace(/[\]]/g, "")
    const editorUrl = `${origin}/${diagramId}`
    const previewUrl = `${origin}/api/diagrams/${diagramId}/preview.svg`
    const embedUrl = `${origin}/embed/${diagramId}`
    return {
      markdownLinked: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
      markdownPlain: `![${safeTitle}](${previewUrl})`,
      iframe: `<iframe src="${embedUrl}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`,
    }
  }, [diagramId, origin, title])

  if (!snippets) {
    return (
      <fieldset className="border border-gray-300 p-2 rounded-xl">
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
    <fieldset className="border border-gray-300 p-2 rounded-xl flex flex-col gap-3">
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

interface SnippetRowProps {
  label: string
  value: string
  hint: string
}

function SnippetRow({ label, value, hint }: SnippetRowProps) {
  const onCopy = () => {
    void navigator.clipboard.writeText(value).then(
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
          onFocus={(e) => e.currentTarget.select()}
          className="grow h-[36px] px-3 py-1.5 border rounded-md border-r-0 rounded-r-none border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)] text-xs font-mono"
        />
        <APButton
          onClick={onCopy}
          variant="outline"
          className="rounded-l-none h-[36px]"
        >
          Copy
        </APButton>
      </div>
    </div>
  )
}
