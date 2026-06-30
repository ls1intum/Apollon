import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import type { ApollonEditor } from "@/apollon-editor"
import { useApollonEditor } from "./context"

/**
 * Subscribe to a value derived from the {@link ApollonEditor}.
 *
 * `getSnapshot` MUST return a referentially stable value when nothing changed;
 * do not allocate inside it. Returns `undefined` while no editor is mounted
 * (including during SSR). Pass the value type explicitly —
 * `useApollonSubscription<string[]>(...)` — it can't be inferred from the
 * `subscribe` callback (its `value` parameter is a contravariant position).
 *
 * @example
 * ```tsx
 * const selection = useApollonSubscription<string[]>(
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

  return useSyncExternalStore(sub, read, read)
}
