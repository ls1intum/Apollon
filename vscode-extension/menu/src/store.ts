import { create } from "zustand"

interface Store {
  diagrams?: string[]
}

const useStore = create<Store>(() => ({
  diagrams: undefined,
}))

export default useStore
