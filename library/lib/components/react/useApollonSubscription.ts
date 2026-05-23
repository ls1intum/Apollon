import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import type { ApollonEditor } from "@/apollon-editor"
import { useApollonEditor } from "./context"

/**
 * Subscribe to a value derived from the {@link ApollonEditor} instance.
 *
 * Implemented with {@link useSyncExternalStore} so concurrent renders never
 * see a torn value across multiple consumers, and the subscribe-window gap
 * (the classic "an event fires between reading the initial value and
 * attaching the subscriber, losing the update") is closed by React.
 *
 * The editor's subscribe primitives return a numeric subscriber id and
 * unregister via `editor.unsubscribe(id)`; this hook adapts that to the
 * `() => void` unsubscribe contract `useSyncExternalStore` expects.
 *
 * Returns `undefined` while no editor is mounted; otherwise the current
 * value. Identity-stability is NOT required of `subscribe` or `initial`:
 * the latest closures are captured in a commit-time effect.
 *
 * The function `initial(editor)` must return a referentially-stable value
 * when the underlying data has not changed — fresh objects on every call
 * will loop React. (Editor getters that snapshot store state already
 * satisfy this; just don't `.map()`/`.filter()` inside the hook.)
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
  initial: (editor: ApollonEditor) => T
): T | undefined {
  const editor = useApollonEditor()

  // Capture the latest closures in a commit-time effect so concurrent
  // re-renders can't write stale values into refs during render. The
  // `useSyncExternalStore` adapters below read these refs.
  const subscribeRef = useRef(subscribe)
  const initialRef = useRef(initial)
  useEffect(() => {
    subscribeRef.current = subscribe
    initialRef.current = initial
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

  const getSnapshot = useCallback(
    () => (editor ? initialRef.current(editor) : undefined),
    [editor]
  )

  // `useSyncExternalStore` requires a third arg for SSR; returning the
  // client snapshot keeps the contract — the editor is client-only, so
  // this only fires on the server with `editor == null` anyway.
  return useSyncExternalStore(sub, getSnapshot, getSnapshot)
}
