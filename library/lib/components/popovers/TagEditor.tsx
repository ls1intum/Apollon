import React, { ChangeEvent, KeyboardEvent, useState } from "react"
import { Plus, X } from "lucide-react"
import { IconButton, TextField, Typography } from "@/components/ui"
import { useLabels } from "@/i18n/useLabels"
import { normalizeTags } from "@/utils"

interface TagEditorProps {
  tags: string[]
  /** Receives the next tag list; empty means "untagged". */
  onChange: (tags: string[]) => void
  /** Localized noun the tags belong to, for the accessible labels. */
  subject: string
}

/**
 * Authoring control for an element's tags, shown as removable chips. The input
 * commits on Enter or blur and splits on commas, so an instructor can paste a
 * whole set of test-case ids at once.
 */
export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onChange,
  subject,
}) => {
  const t = useLabels()
  const [draft, setDraft] = useState("")

  const inputLabel = t.newTagFor(subject)
  const addLabel = t.addTagFor(subject)

  const commitDraft = () => {
    if (draft.trim() !== "")
      onChange(normalizeTags([...tags, ...draft.split(",")]))
    setDraft("")
  }

  const removeTag = (tag: string) =>
    onChange(tags.filter((existing) => existing !== tag))

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commitDraft()
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
        {t.tags}
      </Typography>

      {tags.length > 0 && (
        <div data-slot="tag-chip-list">
          {tags.map((tag) => (
            <span key={tag} data-slot="tag-chip">
              <span>{tag}</span>
              <IconButton
                ariaLabel={t.removeTag(tag)}
                tooltip={t.removeTag(tag)}
                onClick={() => removeTag(tag)}
              >
                <X width={12} height={12} aria-hidden="true" />
              </IconButton>
            </span>
          ))}
        </div>
      )}

      <div className="apollon-add-row">
        <TextField
          fullWidth
          aria-label={inputLabel}
          placeholder={t.addTag}
          value={draft}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setDraft(event.target.value)
          }
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
        />
        <IconButton
          ariaLabel={addLabel}
          tooltip={t.addTag}
          onClick={commitDraft}
        >
          <Plus width={16} height={16} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}
