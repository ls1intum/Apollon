import { useEffect, useRef, type ReactNode } from "react"
import { useApollonEditorOrThrow } from "./context"
import { type OverlayControlOptions } from "../../overlay/types"

export type ApollonControlProps = OverlayControlOptions & {
  children: ReactNode
}

/**
 * Declarative façade over `editor.addControl`. Renders `children` INSIDE the
 * editor's canvas (under the React Flow + store providers), so they may use
 * `useApollonInsets`, `useApollonViewport`, etc. The control is registered once
 * per `id`; option/children changes are pushed to the store so the slot
 * re-renders without re-registering.
 */
export function ApollonControl({
  children,
  ...options
}: ApollonControlProps): null {
  const editor = useApollonEditorOrThrow()
  // Holds the latest children/options for the (stable) render thunk. Seeded from
  // the first render's values; refreshed in an effect (never mutated in render).
  const latest = useRef<{
    children: ReactNode
    options: OverlayControlOptions
  }>({
    children,
    options,
  })

  // Register once per id; the renderer reads the latest children via the ref.
  useEffect(() => {
    const dispose = editor.addControl({
      ...latest.current.options,
      render: () => latest.current.children,
    })
    return dispose
  }, [editor, options.id])

  // After every render, refresh the ref and push the latest options + children
  // to the store so the slot reflects changes (registration stays stable per id).
  useEffect(() => {
    latest.current = { children, options }
    editor.updateControl(options.id, {
      ...options,
      render: () => latest.current.children,
    })
  })

  return null
}
