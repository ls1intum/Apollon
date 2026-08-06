import { useRef, useState, type FocusEvent, type PointerEvent } from "react"
import { isTypingElement } from "@/keyboard"

/**
 * Gives one editor ownership of React Flow's document-level key helpers only
 * while the user is interacting with it.
 *
 * Pointer-acquired focus is released when the pointer leaves. Keyboard focus
 * remains authoritative until it leaves through normal focus navigation.
 */
export function useKeyboardScope(enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pointerOwnsFocusRef = useRef(false)
  const [active, setActive] = useState(false)

  const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0) return

    pointerOwnsFocusRef.current = true
    setActive(true)

    // An empty React Flow pane is not focusable. Give its owning editor a
    // programmatic focus target without adding another stop to the tab order.
    // The pointer's native default then moves focus on to a button, field or
    // focusable node when one was the actual target.
    event.currentTarget.focus({ preventScroll: true })
  }

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    const focused = event.currentTarget.ownerDocument.activeElement
    if (!pointerOwnsFocusRef.current) {
      setActive(
        focused instanceof Node && event.currentTarget.contains(focused)
      )
      return
    }

    pointerOwnsFocusRef.current = false
    setActive(false)
    if (
      focused instanceof HTMLElement &&
      event.currentTarget.contains(focused) &&
      !isTypingElement(focused)
    ) {
      focused.blur()
    }
  }

  const activate = () => {
    if (enabled) setActive(true)
  }

  const onBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    pointerOwnsFocusRef.current = false
    setActive(false)
  }

  return {
    rootRef,
    active: enabled && active,
    rootHandlers: {
      onPointerEnter: activate,
      onPointerDownCapture,
      onPointerLeave,
      onFocusCapture: activate,
      onBlurCapture,
    },
  }
}
