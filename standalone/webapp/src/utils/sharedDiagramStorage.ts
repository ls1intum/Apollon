const SHARED_DIAGRAM_STORE_KEY = "sharedDiagramStore"

export type SharedDiagramEntry = {
  id: string
  sharedAt: string
  favorite: boolean
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

    const entries = parsed.entries.filter(
      (entry): entry is SharedDiagramEntry =>
        Boolean(entry) &&
        typeof entry.id === "string" &&
        typeof entry.sharedAt === "string"
    )

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        sharedAt: entry.sharedAt,
        favorite: Boolean((entry as Partial<SharedDiagramEntry>).favorite),
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

export const addSharedDiagramEntry = (diagramId: string) => {
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
