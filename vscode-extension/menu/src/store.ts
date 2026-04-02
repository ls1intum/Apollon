import { create } from "zustand"

interface Store {
  diagrams?: string[]
  setDiagrams: (diagrams: string[]) => void
}

export const useStore = create<Store>((set) => ({
  diagrams: undefined,
  setDiagrams: (diagrams: string[]) => {
    set({ diagrams: diagrams })
  },
}))

export default useStore
