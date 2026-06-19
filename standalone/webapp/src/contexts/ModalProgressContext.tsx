import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"

type ModalProgressContextValue = {
  isLoading: boolean
  setLoading: (value: boolean) => void
}

const ModalProgressContext = createContext<
  ModalProgressContextValue | undefined
>(undefined)

export const useModalProgress = () => {
  const context = useContext(ModalProgressContext)

  if (!context) {
    throw new Error(
      "useModalProgress must be used within a ModalProgressProvider"
    )
  }

  return context
}

export const ModalProgressProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [isLoading, setLoading] = useState(false)
  const value = useMemo(
    () => ({
      isLoading,
      setLoading,
    }),
    [isLoading]
  )

  return (
    <ModalProgressContext.Provider value={value}>
      {children}
    </ModalProgressContext.Provider>
  )
}
