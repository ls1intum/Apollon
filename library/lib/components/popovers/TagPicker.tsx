import React, { KeyboardEvent, useState } from "react"
import { Check, Plus, Tag, X } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { IconButton } from "@/components/ui"
import { usePortalThemeVars } from "@/components/ui/portalTheme"
import { useLabels } from "@/i18n/useLabels"
import { useTagConfig } from "@/hooks/useTagConfig"
import { normalizeTags } from "@/utils"

interface TagControlProps {
  /** The element's current tags. */
  tags: string[]
  /** Receives the next tag list; empty means "untagged". */
  onChange: (tags: string[]) => void
  /** Localized noun the tags belong to, for the accessible labels. */
  subject: string
}

/**
 * The element's tags as removable chips, on their own compact line. Renders
 * nothing when the element is untagged (so an empty element adds no clutter) or
 * when tagging is disabled — pair with {@link TagPicker}, the button that adds
 * them. Kept separate so the button can sit inline with the other row actions
 * while the chips wrap below only once there is something to show.
 */
export const TagChips: React.FC<Pick<TagControlProps, "tags" | "onChange">> = ({
  tags,
  onChange,
}) => {
  const t = useLabels()
  const { enabled } = useTagConfig()
  if (!enabled || tags.length === 0) return null

  return (
    <div data-slot="tag-field" className="apollon-tag-field">
      {tags.map((tag) => (
        <span key={tag} data-slot="tag-chip" className="apollon-tag-chip">
          <span>{tag}</span>
          <IconButton
            ariaLabel={t.removeTag(tag)}
            tooltip={t.removeTag(tag)}
            onClick={() =>
              onChange(tags.filter((existing) => existing !== tag))
            }
          >
            <X width={12} height={12} aria-hidden="true" />
          </IconButton>
        </span>
      ))}
    </div>
  )
}

/**
 * Tag button that sits with the other row actions (next to the color picker). It
 * opens a combobox popover to search the host vocabulary, toggle a tag, or
 * create one when allowed. Renders nothing until a host enables tagging via the
 * `tags` option — so tagging is opt-in and its vocabulary host-driven. The
 * element's current tags render as chips via {@link TagChips}.
 */
export const TagPicker: React.FC<TagControlProps> = ({
  tags,
  onChange,
  subject,
}) => {
  const t = useLabels()
  const { enabled, available, allowCreate } = useTagConfig()
  const [query, setQuery] = useState("")
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  const portalThemeVars = usePortalThemeVars(trigger)

  if (!enabled) return null

  const commit = (next: string[]) => onChange(normalizeTags(next))
  const toggle = (tag: string) =>
    tags.includes(tag)
      ? commit(tags.filter((existing) => existing !== tag))
      : commit([...tags, tag])

  // Offer the vocabulary plus any tag already on the element (host-set or from an
  // earlier free-form session), so nothing the element carries is hidden.
  const options = [...new Set([...available, ...tags])]
  const trimmed = query.trim()
  const filtered = options.filter((tag) =>
    tag.toLowerCase().includes(trimmed.toLowerCase())
  )
  const canCreate = allowCreate && trimmed !== "" && !options.includes(trimmed)

  const createFromQuery = () => {
    if (!canCreate) return
    commit([...tags, trimmed])
    setQuery("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (canCreate) createFromQuery()
    else if (filtered.length > 0) toggle(filtered[0])
  }

  return (
    <Popover.Root onOpenChange={(open) => !open && setQuery("")}>
      <Popover.Trigger
        ref={setTrigger}
        data-slot="icon-button"
        aria-label={t.editTagsFor(subject)}
      >
        <Tag width={16} height={16} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup
            data-slot="tag-picker-content"
            className="apollon-tag-picker__popup"
            aria-label={t.editTagsFor(subject)}
            style={portalThemeVars}
          >
            <input
              data-slot="tag-picker-search"
              className="apollon-tag-picker__search"
              aria-label={t.tagSearch}
              placeholder={t.tagSearch}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <ul
              data-slot="tag-picker-list"
              className="apollon-tag-picker__list"
              role="listbox"
              aria-label={t.editTagsFor(subject)}
            >
              {filtered.map((tag) => {
                const selected = tags.includes(tag)
                return (
                  <li
                    key={tag}
                    role="option"
                    aria-selected={selected}
                    data-slot="tag-picker-option"
                    className="apollon-tag-picker__option"
                    onClick={() => toggle(tag)}
                  >
                    <Check
                      className="apollon-tag-picker__check"
                      data-selected={selected || undefined}
                      width={14}
                      height={14}
                      aria-hidden="true"
                    />
                    <span>{tag}</span>
                  </li>
                )
              })}

              {canCreate && (
                <li
                  role="option"
                  aria-selected={false}
                  data-slot="tag-picker-create"
                  className="apollon-tag-picker__option apollon-tag-picker__create"
                  onClick={createFromQuery}
                >
                  <Plus width={14} height={14} aria-hidden="true" />
                  <span>{t.createTag(trimmed)}</span>
                </li>
              )}

              {filtered.length === 0 && !canCreate && (
                <li
                  data-slot="tag-picker-empty"
                  className="apollon-tag-picker__empty"
                >
                  {t.noTags}
                </li>
              )}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
