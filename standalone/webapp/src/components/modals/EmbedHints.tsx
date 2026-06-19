import { useMemo } from "react"
import { toast } from "react-toastify"
import { isPlatform } from "@ionic/react"
import { Clipboard } from "@capacitor/clipboard"
import { Typography } from "@/components/Typography"
import { Button } from "@/components/ui/button"
import { serverURL } from "@/constants/urls"
import { useDiagramIdFromPath } from "@/hooks/useDiagramIdFromPath"
import { buildSharedDiagramUrl } from "@/utils/sharedDiagramLinks"

/**
 * Embed-hints panel for the share modal.
 *
 * Renders three copyable snippets pointing at the *current* diagram (the
 * diagramId is the bearer — there's no token, no role gate):
 *
 *   1. Markdown image with click-through, GitHub/GitLab README friendly:
 *        [![title](<server>/api/diagrams/:id/preview.svg)](<web>/shared/:id?view=EDIT)
 *   2. Plain markdown image (no click-through).
 *   3. HTML iframe pointing at `<server>/embed/:id` for surfaces that allow it
 *      (GitLab Pages, Notion, Confluence, VS Code preview).
 *
 * The preview SVG and `/embed` page are served by the API server, so their URLs
 * use the server origin (`serverURL`, else the page origin); the click-through
 * uses `buildSharedDiagramUrl` so it always lands on the canonical, view-scoped
 * `/shared/:id` route. The id is read from the path; without one (e.g. the
 * local-only editor) the panel shows a save-first hint.
 */
export function EmbedHints({ title = "Apollon diagram" }: { title?: string }) {
  const diagramId = useDiagramIdFromPath()

  const snippets = useMemo(() => {
    if (!diagramId) return null
    // The page origin falls back when no dedicated API origin is configured
    // (same-origin deploy). Bracket-strip keeps the markdown alt text from
    // breaking the `![alt](url)` grammar.
    const serverOrigin =
      serverURL || (typeof window !== "undefined" ? window.location.origin : "")
    const safeTitle = title.replace(/[[\]]/g, "")
    const editorUrl = buildSharedDiagramUrl(diagramId)
    const previewUrl = `${serverOrigin}/api/diagrams/${diagramId}/preview.svg`
    const embedUrl = `${serverOrigin}/embed/${diagramId}`
    return {
      markdownLinked: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
      markdownPlain: `![${safeTitle}](${previewUrl})`,
      iframe: `<iframe src="${embedUrl}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`,
    }
  }, [diagramId, title])

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

async function copyToClipboard(value: string): Promise<void> {
  if (isPlatform("capacitor")) {
    await Clipboard.write({ string: value })
  } else {
    await navigator.clipboard.writeText(value)
  }
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
          onFocus={(e) => e.currentTarget.select()}
          className="grow h-[36px] px-3 py-1.5 border rounded-md border-r-0 rounded-r-none border-[var(--apollon-primary-contrast)] bg-[var(--apollon-background)] text-[var(--apollon-primary-contrast)] text-xs font-mono"
        />
        <Button
          onClick={onCopy}
          variant="outline"
          className="rounded-l-none h-[36px]"
        >
          Copy
        </Button>
      </div>
    </div>
  )
}
