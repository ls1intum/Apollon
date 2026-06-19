import type { CollaborationViewport, DraggingNode } from "@/typings"

const COLLAB_COLORS = [
  "#ffb61e",
  "#37b24d",
  "#1c7ed6",
  "#f03e3e",
  "#ae3ec9",
  "#0ca678",
  "#f76707",
  "#1098ad",
]

const ADJECTIVES = [
  "Swift",
  "Bold",
  "Clever",
  "Bright",
  "Calm",
  "Eager",
  "Kind",
  "Noble",
]

const ANIMALS = [
  "Falcon",
  "Otter",
  "Panda",
  "Lynx",
  "Dolphin",
  "Owl",
  "Fox",
  "Crane",
]

export const randomCollabName = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${adj} ${animal}`
}

export const collabColorFromName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % COLLAB_COLORS.length
  return COLLAB_COLORS[index]
}

/**
 * Narrow an untrusted, peer-supplied viewport before it reaches React Flow's
 * `setViewport`. A `NaN`/`Infinity`/non-positive zoom corrupts the canvas
 * transform, so every field must be a finite number and zoom must be positive.
 * Returns `null` for anything malformed.
 */
export const sanitizeCollaborationViewport = (
  raw: unknown
): CollaborationViewport | null => {
  if (raw == null || typeof raw !== "object") return null
  const { x, y, zoom } = raw as Record<string, unknown>
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(zoom) ||
    (zoom as number) <= 0
  ) {
    return null
  }
  return { x: x as number, y: y as number, zoom: zoom as number }
}

/**
 * Narrow an untrusted, peer-supplied `draggingNodes` payload before the overlay
 * reader iterates it. A non-array value (or entries missing a string `id` or a
 * finite numeric position) would otherwise throw in the awareness subscription
 * handler and break the live overlay for everyone reading that peer. Returns the
 * well-formed entries only; `null` if the value isn't an array. Per-entry
 * `width`/`height` survive only when finite or explicitly `null`.
 */
export const sanitizeDraggingNodes = (raw: unknown): DraggingNode[] | null => {
  if (!Array.isArray(raw)) return null
  const sanitized: DraggingNode[] = []
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object") continue
    const { id, position, width, height } = entry as Record<string, unknown>
    if (
      typeof id !== "string" ||
      position == null ||
      typeof position !== "object"
    )
      continue
    const { x, y } = position as Record<string, unknown>
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const node: DraggingNode = {
      id,
      position: { x: x as number, y: y as number },
    }
    if (width === null || Number.isFinite(width))
      node.width = width as number | null
    if (height === null || Number.isFinite(height))
      node.height = height as number | null
    sanitized.push(node)
  }
  return sanitized
}
