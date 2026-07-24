import React, { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { EditorProvider, ModalProvider } from "@/contexts"
import { queryClient } from "@/queryClient"

interface Props {
  children: ReactNode
}

/**
 * Query Devtools are opt-in: they float a toggle button over the editor's own
 * floating chrome, which is in the way far more often than it is useful. Turn
 * them on per browser with
 *
 *   localStorage.setItem("apollon:query-devtools", "1")
 *
 * and reload. Read once at module load — the flag is a debugging switch, not
 * reactive state. Production is unaffected either way: the package swaps
 * itself for a no-op export when `NODE_ENV !== "development"`.
 */
const SHOW_QUERY_DEVTOOLS =
  import.meta.env.DEV &&
  (() => {
    try {
      return localStorage.getItem("apollon:query-devtools") === "1"
    } catch {
      // Storage throws when cookies / site data are blocked.
      return false
    }
  })()

export const AppProviders: React.FC<Props> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <EditorProvider>
        <ModalProvider>{children}</ModalProvider>
      </EditorProvider>
      {SHOW_QUERY_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
