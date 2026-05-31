import { DiagramView } from "@/types"
import { normalizeSharedDiagramView } from "@/utils/sharedDiagramLinks"

const SHARED_DIAGRAM_STORE_KEY = "sharedDiagramStore"

export type SharedDiagramEntry = {
  id: string
  sharedAt: string
  favorite: boolean
  lastSharedView: DiagramView
  sourceModelId?: string
  lastCopiedAt?: string
}

type SharedDiagramStore = {
  entries: SharedDiagramEntry[]
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
        sharedAt: entry.sharedAt,
        favorite: Boolean((entry as Partial<SharedDiagramEntry>).favorite),
        lastSharedView: normalizeSharedDiagramView(entry.lastSharedView),
        sourceModelId:
          typeof entry.sourceModelId === "string"
            ? entry.sourceModelId
            : undefined,
        lastCopiedAt:
          typeof entry.lastCopiedAt === "string"
            ? entry.lastCopiedAt
            : undefined,
      })),
    }
  } catch {
    return { entries: [] }
  }
}

const writeStore = (store: SharedDiagramStore) => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SHARED_DIAGRAM_STORE_KEY, JSON.stringify(store))
}

export const getSharedDiagramEntries = (): SharedDiagramEntry[] =>
  readStore().entries

type AddSharedDiagramEntryOptions = {
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
        sharedAt: now,
        favorite: existingEntry?.favorite ?? false,
        lastSharedView:
          options.lastSharedView ??
          existingEntry?.lastSharedView ??
          DiagramView.EDIT,
        sourceModelId: options.sourceModelId ?? existingEntry?.sourceModelId,
        lastCopiedAt: options.lastCopiedAt ?? existingEntry?.lastCopiedAt,
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
          }
        : entry
    ),
  })
}
