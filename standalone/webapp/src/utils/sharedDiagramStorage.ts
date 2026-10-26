import { DiagramView } from "@/types"
import {
  isDiagramView,
  DEFAULT_SHARED_DIAGRAM_VIEW,
} from "@/utils/sharedDiagramLinks"

const SHARED_DIAGRAM_STORE_KEY = "sharedDiagramStore"
const SHARED_DIAGRAM_EXPIRY_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export type SharedDiagramEntry = {
  id: string
  writeToken?: string
  sharedAt: string
  favorite: boolean
  lastSharedView: DiagramView
  sourceModelId?: string
  lastCopiedAt?: string
  expiredAt?: string
}

type SharedDiagramStore = {
  entries: SharedDiagramEntry[]
}

const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false
  }

  return !Number.isNaN(new Date(value).getTime())
}

const readStore = (): SharedDiagramStore => {
  if (typeof window === "undefined") {
    return { entries: [] }
  }

  try {
    const raw = window.localStorage.getItem(SHARED_DIAGRAM_STORE_KEY)
    if (!raw) {
      return { entries: [] }
    }

    const parsed = JSON.parse(raw) as Partial<SharedDiagramStore>
    if (!Array.isArray(parsed.entries)) {
      return { entries: [] }
    }

    const rawEntries = parsed.entries as unknown[]
    const entries = rawEntries.filter(
      (
        entry
      ): entry is Partial<SharedDiagramEntry> & {
        id: string
        sharedAt: string
      } => {
        if (!entry || typeof entry !== "object") {
          return false
        }
        const candidate = entry as Partial<SharedDiagramEntry>
        return (
          typeof candidate.id === "string" &&
          typeof candidate.sharedAt === "string"
        )
      }
    )

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        writeToken:
          typeof entry.writeToken === "string" ? entry.writeToken : undefined,
        sharedAt: entry.sharedAt,
        favorite: Boolean((entry as Partial<SharedDiagramEntry>).favorite),
        // Entries with no stored mode default to EDIT (the Collaborate default
        // applies only to new shares, added on write).
        lastSharedView: isDiagramView(entry.lastSharedView)
          ? entry.lastSharedView
          : DiagramView.EDIT,
        sourceModelId:
          typeof entry.sourceModelId === "string"
            ? entry.sourceModelId
            : undefined,
        lastCopiedAt:
          typeof entry.lastCopiedAt === "string"
            ? entry.lastCopiedAt
            : undefined,
        expiredAt: isIsoDateString(entry.expiredAt)
          ? entry.expiredAt
          : undefined,
      })),
    }
  } catch {
    return { entries: [] }
  }
}

// Same-tab change event (the native `storage` event is cross-tab only).
const SHARED_DIAGRAM_CHANGE_EVENT = "shared-diagram-store-change"

const writeStore = (store: SharedDiagramStore) => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SHARED_DIAGRAM_STORE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event(SHARED_DIAGRAM_CHANGE_EVENT))
}

// Subscribe to same-tab store mutations. Returns an unsubscribe function.
export const subscribeToSharedDiagramChange = (
  listener: () => void
): (() => void) => {
  if (typeof window === "undefined") {
    return () => {}
  }

  window.addEventListener(SHARED_DIAGRAM_CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener(SHARED_DIAGRAM_CHANGE_EVENT, listener)
  }
}

export const getSharedDiagramEntries = (): SharedDiagramEntry[] =>
  readStore().entries

// Capabilities the server rejected in this page session. A rejected `#access`
// token stays in the address bar, so it must be skipped instead of deleted.
const rejectedWriteTokens = new Set<string>()

// Capabilities are compact JWS tokens. Anything else (for example a damaged
// `#access` value with a line break) is not a capability, and fetch would throw
// on it as an invalid Authorization header value.
const COMPACT_JWS = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

const usableWriteToken = (token: string | null | undefined) =>
  token && COMPACT_JWS.test(token) && !rejectedWriteTokens.has(token)
    ? token
    : undefined

export const getSharedDiagramWriteToken = (
  diagramId: string
): string | undefined => {
  if (typeof window === "undefined") return undefined
  if (window.location.pathname === `/shared/${encodeURIComponent(diagramId)}`) {
    const fromLink = usableWriteToken(
      new URLSearchParams(window.location.hash.slice(1)).get("access")
    )
    if (fromLink) return fromLink
  }
  return usableWriteToken(
    readStore().entries.find((entry) => entry.id === diagramId)?.writeToken
  )
}

const setEntryWriteToken = (
  diagramId: string,
  writeToken: string | undefined
) => {
  const { entries } = readStore()
  writeStore({
    entries: entries.map((entry) =>
      entry.id === diagramId ? { ...entry, writeToken } : entry
    ),
  })
}

// Caches a capability the server confirmed. Unlike addSharedDiagramEntry, this
// keeps the entry's position and timestamps and writes nothing when the token
// is unchanged, because the gallery refetches whenever the entry order changes.
export const storeSharedDiagramWriteToken = (
  diagramId: string,
  writeToken: string
) => {
  const entry = readStore().entries.find((e) => e.id === diagramId)
  if (!entry) addSharedDiagramEntry(diagramId, { writeToken })
  else if (entry.writeToken !== writeToken)
    setEntryWriteToken(diagramId, writeToken)
}

export const discardSharedDiagramWriteToken = (
  diagramId: string,
  writeToken: string
) => {
  rejectedWriteTokens.add(writeToken)
  const entry = readStore().entries.find((e) => e.id === diagramId)
  if (entry?.writeToken === writeToken) setEntryWriteToken(diagramId, undefined)
}

type AddSharedDiagramEntryOptions = {
  writeToken?: string
  lastSharedView?: DiagramView
  sourceModelId?: string
  lastCopiedAt?: string
}

export const addSharedDiagramEntry = (
  diagramId: string,
  options: AddSharedDiagramEntryOptions = {}
) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  const now = new Date().toISOString()
  const existingEntry = currentStore.entries.find(
    (entry) => entry.id === normalizedId
  )
  const remainingEntries = currentStore.entries.filter(
    (entry) => entry.id !== normalizedId
  )

  writeStore({
    entries: [
      {
        id: normalizedId,
        writeToken: options.writeToken ?? existingEntry?.writeToken,
        sharedAt: now,
        favorite: existingEntry?.favorite ?? false,
        // New share with no explicit mode adopts the Collaborate default; an
        // existing entry keeps its mode. (Stored entries with no mode default to
        // EDIT on load instead.)
        lastSharedView:
          options.lastSharedView ??
          existingEntry?.lastSharedView ??
          DEFAULT_SHARED_DIAGRAM_VIEW,
        sourceModelId: options.sourceModelId ?? existingEntry?.sourceModelId,
        lastCopiedAt: options.lastCopiedAt ?? existingEntry?.lastCopiedAt,
        expiredAt: undefined,
      },
      ...remainingEntries,
    ],
  })
}

export const removeSharedDiagramEntry = (diagramId: string) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  writeStore({
    entries: currentStore.entries.filter((entry) => entry.id !== normalizedId),
  })
}

export const toggleSharedDiagramFavorite = (diagramId: string) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  writeStore({
    entries: currentStore.entries.map((entry) =>
      entry.id === normalizedId
        ? {
            ...entry,
            favorite: !entry.favorite,
          }
        : entry
    ),
  })
}

export const updateSharedDiagramView = (
  diagramId: string,
  view: DiagramView
) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  writeStore({
    entries: currentStore.entries.map((entry) =>
      entry.id === normalizedId
        ? {
            ...entry,
            lastSharedView: view,
          }
        : entry
    ),
  })
}

export const markSharedDiagramCopied = (
  diagramId: string,
  view?: DiagramView
) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  const now = new Date().toISOString()
  writeStore({
    entries: currentStore.entries.map((entry) =>
      entry.id === normalizedId
        ? {
            ...entry,
            lastSharedView: view ?? entry.lastSharedView,
            lastCopiedAt: now,
            expiredAt: undefined,
          }
        : entry
    ),
  })
}

export const markSharedDiagramExpired = (
  diagramId: string,
  expiredAt = new Date().toISOString()
) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  const hasChanged = currentStore.entries.some(
    (entry) => entry.id === normalizedId && !entry.expiredAt
  )
  if (!hasChanged) {
    return
  }

  writeStore({
    entries: currentStore.entries.map((entry) =>
      entry.id === normalizedId
        ? {
            ...entry,
            expiredAt: entry.expiredAt ?? expiredAt,
          }
        : entry
    ),
  })
}

export const clearSharedDiagramExpiredState = (diagramId: string) => {
  const normalizedId = diagramId.trim()
  if (!normalizedId) {
    return
  }

  const currentStore = readStore()
  const hasChanged = currentStore.entries.some(
    (entry) => entry.id === normalizedId && Boolean(entry.expiredAt)
  )
  if (!hasChanged) {
    return
  }

  writeStore({
    entries: currentStore.entries.map((entry) =>
      entry.id === normalizedId && entry.expiredAt
        ? {
            ...entry,
            expiredAt: undefined,
          }
        : entry
    ),
  })
}

export const pruneExpiredSharedDiagrams = (
  now = new Date()
): SharedDiagramEntry[] => {
  const currentStore = readStore()
  const cutoffTime = now.getTime() - SHARED_DIAGRAM_EXPIRY_GRACE_PERIOD_MS
  const entries = currentStore.entries.filter((entry) => {
    if (!entry.expiredAt) {
      return true
    }

    return new Date(entry.expiredAt).getTime() >= cutoffTime
  })

  if (entries.length !== currentStore.entries.length) {
    writeStore({ entries })
  }

  return entries
}
