import { useEffect, useId, useRef, useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
import { Tabs, TabsList, TabsTrigger } from "@tumaet/ui/components/tabs"
import { copyToClipboard } from "@/utils/clipboard"
import { DiagramView } from "@/types"
import {
  buildSharedDiagramUrl,
  resolveServerOrigin,
} from "@/utils/sharedDiagramLinks"

/**
 * Embed panel for the share modal: a format picker plus one copy-paste snippet
 * that renders a live, auto-updating diagram. `diagramId` is the server id of a
 * shared diagram; without one the panel shows a share-first hint.
 */

type EmbedFormat = "markdown" | "markdown-plain" | "iframe"

const FORMAT_OPTIONS: readonly { value: EmbedFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "markdown-plain", label: "Markdown (no link)" },
  { value: "iframe", label: "iframe" },
]

const FORMAT_HINTS: Record<EmbedFormat, string> = {
  markdown: "A clickable, auto-updating card — opens the diagram in Apollon.",
  "markdown-plain": "The same card, image only — no link.",
  iframe: "An interactive embed for pages that allow iframes.",
}

export function EmbedSnippetPanel({
  diagramId,
  title = "Apollon diagram",
}: {
  diagramId?: string
  title?: string
}) {
  const [format, setFormat] = useState<EmbedFormat>("markdown")
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintId = useId()
  const snippets = diagramId ? buildSnippets(diagramId, title) : null

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    []
  )

  const onCopy = (value: string) => {
    void copyToClipboard(value).then(
      () => {
        setCopied(true)
        if (copyTimer.current) clearTimeout(copyTimer.current)
        copyTimer.current = setTimeout(() => setCopied(false), 2000)
        toast.success("Embed code copied")
      },
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
          <Tabs
            value={format}
            onValueChange={(value) => setFormat(value as EmbedFormat)}
          >
            <TabsList>
              {FORMAT_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-stretch">
            <input
              type="text"
              value={snippets[format]}
              readOnly
              spellCheck={false}
              aria-label="Embed code"
              aria-describedby={hintId}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 min-w-0 grow rounded-l-md border border-r-0 border-[var(--home-border-default)] bg-[var(--apollon-background)] px-3 font-mono text-xs text-[var(--apollon-primary-contrast)] outline-none"
            />
            <Button
              onClick={() => onCopy(snippets[format])}
              variant="outline"
              aria-label="Copy embed code"
              className="h-9 shrink-0 rounded-l-none px-3 text-xs"
            >
              {copied ? "Copied" : "Copy"}
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
 * The click-through opens the diagram in collaboration mode; the non-clickable
 * variant requests `?frame=plain`, dropping the card's button that links nowhere.
 */
function buildSnippets(
  diagramId: string,
  title: string
): Record<EmbedFormat, string> | null {
  const serverOrigin = resolveServerOrigin()
  if (!serverOrigin) return null
  const safeTitle = sanitizeMarkdownAlt(title)
  const id = encodeURIComponent(diagramId)
  const editorUrl = buildSharedDiagramUrl(diagramId, DiagramView.COLLABORATE)
  const previewUrl = `${serverOrigin}/api/diagrams/${id}/preview.svg`
  const embedUrl = `${serverOrigin}/embed/${id}`
  return {
    markdown: `[![${safeTitle}](${previewUrl})](${editorUrl})`,
    "markdown-plain": `![${safeTitle}](${previewUrl}?frame=plain)`,
    iframe: `<iframe src="${embedUrl}" width="800" height="500" loading="lazy" referrerpolicy="no-referrer" style="border:0;border-radius:8px"></iframe>`,
  }
}
