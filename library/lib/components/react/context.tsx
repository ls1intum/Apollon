import { createContext, useContext, type ReactNode } from "react"
import type { ApollonEditor } from "@/apollon-editor"

/** Live {@link ApollonEditor} instance; `null` until the mount effect commits. */
export const ApollonInstanceContext = createContext<ApollonEditor | null>(null)

export function useApollonEditor(): ApollonEditor | null {
  return useContext(ApollonInstanceContext)
}

/** Like {@link useApollonEditor}, but throws when no editor is available. */
export function useApollonEditorOrThrow(): ApollonEditor {
  const editor = useApollonEditor()
  if (!editor) {
    throw new Error(
      "useApollonEditorOrThrow: no <Apollon> (or <ApollonProvider>) in the tree, or the editor has not finished mounting."
    )
  }
  return editor
}

/**
 * Make a host-owned {@link ApollonEditor} reachable to descendants via
 * {@link useApollonEditor}. Use when the host constructs the editor directly
 * (non-React adapter, test fixture) instead of rendering {@link Apollon}.
 */
export function ApollonProvider({
  editor,
  children,
}: {
  editor: ApollonEditor
  children: ReactNode
}) {
  return (
    <ApollonInstanceContext.Provider value={editor}>
      {children}
    </ApollonInstanceContext.Provider>
  )
}
