import React, {
  createContext,
  useCallback,
  use,
  useId,
  useMemo,
  useState,
} from "react"

/**
 * Coordinates the colour editors in a single popover so only one is open at a
 * time: opening one collapses any other. A popover with many editors (e.g. a
 * class with several attributes/methods) would otherwise stack open panels.
 *
 * Each editor calls `useColorEditorDisclosure()` to get an `open` flag and a
 * `setOpen` that, when opening, also becomes the group's single active editor.
 * Outside a provider it falls back to plain independent local state, so the
 * editors still work standalone.
 */
interface ColorEditorGroupContextValue {
  openId: string | null
  setOpenId: (id: string | null) => void
}

const ColorEditorGroupContext =
  createContext<ColorEditorGroupContextValue | null>(null)

export const ColorEditorGroupProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const value = useMemo(() => ({ openId, setOpenId }), [openId])
  return (
    <ColorEditorGroupContext.Provider value={value}>
      {children}
    </ColorEditorGroupContext.Provider>
  )
}

/**
 * Disclosure state for one colour editor. Uses the surrounding group (one open
 * at a time) when present, otherwise independent local state.
 */
export const useColorEditorDisclosure = (): {
  open: boolean
  setOpen: (next: boolean) => void
} => {
  const id = useId()
  const group = use(ColorEditorGroupContext)
  const [localOpen, setLocalOpen] = useState(false)

  const open = group ? group.openId === id : localOpen

  const setOpen = useCallback(
    (next: boolean) => {
      if (group) {
        group.setOpenId(next ? id : null)
      } else {
        setLocalOpen(next)
      }
    },
    [group, id]
  )

  return { open, setOpen }
}
