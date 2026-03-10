import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"

export type AlignmentGuide = {
  id: string
  type: "vertical" | "horizontal"
  position: number // x for vertical, y for horizontal
  offset?: number // visual offset for better visibility
}

type InitialAlignmentGuidesState = {
  guides: AlignmentGuide[]
}

const initialAlignmentGuidesState: InitialAlignmentGuidesState = {
  guides: [],
}

export type AlignmentGuidesStore = {
  guides: AlignmentGuide[]
  setGuides: (guides: AlignmentGuide[]) => void
  clearGuides: () => void
}

export const createAlignmentGuidesStore = (): UseBoundStore<
  StoreApi<AlignmentGuidesStore>
> =>
  create<AlignmentGuidesStore>()(
    devtools(
      subscribeWithSelector((set) => ({
        ...initialAlignmentGuidesState,

        setGuides: (guides: AlignmentGuide[]) => {
          set({ guides })
        },

        clearGuides: () => {
          set({ guides: [] })
        },
      })),
      {
        name: "AlignmentGuidesStore",
      }
    )
  )
