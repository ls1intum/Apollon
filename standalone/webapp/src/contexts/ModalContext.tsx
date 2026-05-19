import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react"
import { ModalName, ModalProps } from "@/types"
import { ModalWrapper } from "@/wrappers"

interface ModalContextType {
  openModal: (name: ModalName, props?: ModalProps) => void
  closeModal: () => void
  currentModal: { name: ModalName; props?: ModalProps } | null
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const useModalContext = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider")
  }
  return context
}

interface Props {
  children: ReactNode
}

export const ModalProvider: React.FC<Props> = ({ children }) => {
  const [currentModal, setCurrentModal] = useState<{
    name: ModalName
    props?: ModalProps
  } | null>(null)

  const openModal = (name: ModalName, props?: ModalProps) => {
    setCurrentModal({ name, props })
  }

  const closeModal = () => {
    setCurrentModal(null)
  }

  const contextValue = useMemo(
    () => ({
      openModal,
      closeModal,
      currentModal,
    }),
    [currentModal]
  )

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {/* Render the current modal if any */}
      {currentModal && (
        <ModalWrapper
          name={currentModal.name}
          props={currentModal.props}
          closeModal={closeModal}
        />
      )}
    </ModalContext.Provider>
  )
}
