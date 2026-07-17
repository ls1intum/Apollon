// The single source of tag semantics: every reader and writer of `data.tags`
// goes through here, so they cannot disagree. See `DefaultNodeProps.tags`.
import { ApollonNode } from "@/typings"

/** Over-length tags are dropped, not truncated. */
export const MAX_TAG_LENGTH = 200
/** Tags past this many on one element are dropped. */
export const MAX_TAGS_PER_ELEMENT = 50

// Real tags contain `()`, `[]`, and unicode, so only control characters are
// rejected: JSON-legal, but pathological in a label.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/

type TaggableData = { tags?: unknown; [key: string]: unknown }

/**
 * Canonical tag form: trimmed, de-duplicated (first occurrence wins, order
 * preserved). Idempotent. Takes `unknown` because models arrive from hosts as
 * untrusted JSON, so a `tags` entry may be any shape.
 */
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of raw) {
    if (typeof entry !== "string") continue
    const tag = entry.trim()
    if (tag === "" || tag.length > MAX_TAG_LENGTH || CONTROL_CHARS.test(tag)) {
      continue
    }
    if (seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
    if (result.length >= MAX_TAGS_PER_ELEMENT) break
  }
  return result
}

/**
 * Every taggable element in `nodes`: each node, plus every id-bearing object in
 * any array on its `data` (class attributes/methods, SFC action rows).
 * Membership is structural, so a new member list needs no change here.
 */
export function* taggableElements(
  nodes: readonly Pick<ApollonNode, "id" | "data">[]
): Generator<{ id: string; data: TaggableData }> {
  for (const node of nodes) {
    const data = (node.data ?? {}) as TaggableData
    yield { id: node.id, data }
    for (const [key, value] of Object.entries(data)) {
      // `tags` is the payload, not a member list — never recurse into it.
      if (key === "tags" || !Array.isArray(value)) continue
      for (const item of value) {
        if (item && typeof item === "object" && typeof item.id === "string") {
          yield { id: item.id, data: item as TaggableData }
        }
      }
    }
  }
}

/**
 * Store the normalized list, or omit the key when empty: an absent key and `[]`
 * differ to the store's `deepEqual`, so a stray `[]` would be a permanent Yjs
 * write and undo entry. Mutates `data`; `withTags` is the copying form.
 */
export function applyTags(data: TaggableData, tags: unknown): void {
  const normalized = normalizeTags(tags)
  if (normalized.length > 0) data.tags = normalized
  else delete data.tags
}

/** Copy of `data` carrying `tags`, for the immutable store update path. */
export function withTags<T extends object>(data: T, tags: string[]): T {
  const next = { ...data }
  applyTags(next as TaggableData, tags)
  return next
}

/**
 * Ids of every element carrying `tag`. The query is canonicalized exactly like
 * stored tags, so a host always matches with the string it wrote.
 */
export function getElementIdsByTag(
  nodes: readonly Pick<ApollonNode, "id" | "data">[],
  tag: string
): string[] {
  if (typeof tag !== "string") return []
  const query = tag.trim()
  if (query === "") return []
  const ids: string[] = []
  for (const { id, data } of taggableElements(nodes)) {
    if (normalizeTags(data.tags).includes(query)) ids.push(id)
  }
  return ids
}
