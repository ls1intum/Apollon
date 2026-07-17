import { createContext, use, type ReactNode } from "react"
import type { RepositoryKind } from "@/services/versionRepository"

const VersionRepositoryContext = createContext<RepositoryKind | null>(null)

/**
 * Declares which version-history backend the subtree talks to. Each editor
 * page provides its own constant (`/local/*` → local, `/shared/*` → remote),
 * so the kind can never disagree with the route or change under a mounted
 * consumer mid-navigation.
 *
 * Surfaces rendered outside the page's subtree — modals, which mount under
 * `ModalProvider` at the app root — take the kind as a prop from whoever
 * opened them instead.
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
