import React, { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { EditorProvider, ModalProvider } from "@/contexts"
import { queryClient } from "@/queryClient"

interface Props {
  children: ReactNode
}

export const AppProviders: React.FC<Props> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <EditorProvider>
        <ModalProvider>{children}</ModalProvider>
      </EditorProvider>
      {/* Self-excludes from production bundles: the package swaps in a no-op
          export when NODE_ENV !== "development", so no env gate is needed. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
