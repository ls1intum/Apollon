import type { CollaborationViewport } from "@/typings"

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
