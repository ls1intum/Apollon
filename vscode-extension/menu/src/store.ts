import { create } from "zustand"

interface Store {
  diagrams?: string[]
}

export const useStore = create<Store>(() => ({
  diagrams: undefined,
}))

export default useStore
