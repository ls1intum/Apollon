import { createContext, useContext, type ReactNode } from "react"
import type { ApollonEditor } from "@/apollon-editor"

/**
 * Context carrying the live {@link ApollonEditor} instance. `null` between
 * the first render of {@link Apollon} and the commit of its mount effect;
 * the editor instance for the rest of the component's lifetime.
 */
export const ApollonInstanceContext = createContext<ApollonEditor | null>(null)

/**
 * Returns the {@link ApollonEditor} instance of the nearest enclosing
 * {@link Apollon} (or {@link ApollonProvider}). Returns `null` on the
 * first render and during the brief gap before the editor has mounted;
 * callers in effects/handlers see the instance.
 *
 * Use {@link useApollonEditorOrThrow} when you're certain you're rendered
 * under a mounted {@link Apollon} and want a non-null return.
 */
export function useApollonEditor(): ApollonEditor | null {
  return useContext(ApollonInstanceContext)
}

/** Like {@link useApollonEditor}, but throws when no editor is available. */
export function useApollonEditorOrThrow(): ApollonEditor {
  const editor = useApollonEditor()
  if (!editor) {
    throw new Error(
      "useApollonEditorOrThrow: no <Apollon> (or <ApollonProvider>) found in the React tree, or the editor has not finished mounting."
    )
  }
  return editor
}

/**
 * Make an existing {@link ApollonEditor} instance reachable to descendants
 * via {@link useApollonEditor}. Useful when the host owns the editor's
 * lifecycle directly (e.g. via `new ApollonEditor(...)` in a non-React
 * adapter) rather than rendering {@link Apollon}.
 */
export function ApollonProvider({
  editor,
  children,
}: {
  editor: ApollonEditor | null
  children: ReactNode
}) {
  return (
    <ApollonInstanceContext.Provider value={editor}>
      {children}
    </ApollonInstanceContext.Provider>
  )
}
