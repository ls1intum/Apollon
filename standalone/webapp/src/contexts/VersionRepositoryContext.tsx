import { createContext, use, type ReactNode } from "react"
import type { RepositoryKind } from "@/services/versionRepository"

const VersionRepositoryContext = createContext<RepositoryKind | null>(null)

/**
 * Declares which version-history backend the subtree talks to. Each editor
 * route provides its own constant (`/local/*` → local, `/shared/*` → remote),
 * so the kind can never disagree with the route or change under a mounted
 * consumer mid-navigation.
 *
 * Two surfaces render OUTSIDE the routed subtree and so cannot read this:
 * modals (`ModalProvider`) and toast bodies (`ToastContainer`), both mounted
 * at the app root. They take the kind as a prop from whoever opened them —
 * see `DeleteVersionModal` and `UndoRestoreToast`.
 */
export const VersionRepositoryProvider = ({
  kind,
  children,
}: {
  kind: RepositoryKind
  children: ReactNode
}) => (
  <VersionRepositoryContext value={kind}>{children}</VersionRepositoryContext>
)

export function useVersionRepositoryKind(): RepositoryKind {
  const kind = use(VersionRepositoryContext)
  if (!kind) {
    throw new Error(
      "useVersionRepositoryKind must be used within a VersionRepositoryProvider"
    )
  }
  return kind
}
