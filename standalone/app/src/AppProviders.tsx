import React, { ReactNode } from "react"
import { EditorProvider, ModalProvider } from "@/contexts"

interface Props {
  children: ReactNode
}

export const AppProviders: React.FC<Props> = ({ children }) => {
  return (
    <EditorProvider>
      <ModalProvider>{children}</ModalProvider>
    </EditorProvider>
  )
}
