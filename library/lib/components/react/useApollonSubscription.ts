import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import type { ApollonEditor } from "@/apollon-editor"
import { useApollonEditor } from "./context"

/**
 * Subscribe to a value derived from the {@link ApollonEditor}.
 *
 * Backed by {@link useSyncExternalStore} so concurrent renders never tear and
 * no event is lost between the initial read and subscriber attach. `subscribe`
 * and `getSnapshot` need not be referentially stable — the latest closures are
 * captured in a commit-time effect. `getSnapshot` MUST return a referentially
 * stable value when nothing changed; don't allocate inside it.
 *
 * Returns `undefined` while no editor is mounted (including during SSR).
 *
 * @example
 * ```tsx
 * const selection = useApollonSubscription(
 *   (editor, cb) => editor.subscribeToSelectionChange(cb),
 *   (editor) => editor.getSelectedElements(),
 * )
 * ```
 */
export function useApollonSubscription<T>(
  subscribe: (editor: ApollonEditor, cb: (value: T) => void) => number,
  getSnapshot: (editor: ApollonEditor) => T
): T | undefined {
  const editor = useApollonEditor()

  const subscribeRef = useRef(subscribe)
  const getSnapshotRef = useRef(getSnapshot)
  useEffect(() => {
    subscribeRef.current = subscribe
    getSnapshotRef.current = getSnapshot
  })

  const sub = useCallback(
    (notify: () => void) => {
      if (!editor) return () => {}
      const id = subscribeRef.current(editor, notify as (v: T) => void)
      return () => {
        editor.unsubscribe(id)
      }
    },
    [editor]
  )

  const read = useCallback(
    () => (editor ? getSnapshotRef.current(editor) : undefined),
    [editor]
  )

  // SSR snapshot === client snapshot; editor is client-only and `read` returns
  // `undefined` whenever the editor is unset.
  return useSyncExternalStore(sub, read, read)
}
