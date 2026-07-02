import { useCallback, useEffect, useRef, type KeyboardEvent } from "react"

/** Enabled, focusable buttons in DOM (left→right) order. */
function focusableButtons(el: HTMLElement): HTMLButtonElement[] {
  return Array.from(el.querySelectorAll<HTMLButtonElement>("button")).filter(
    (b) => !b.disabled && b.getAttribute("aria-hidden") !== "true"
  )
}

/** Keep exactly one enabled button in the tab order; the rest are tabIndex -1. */
function syncTabStops(el: HTMLElement) {
  const all = Array.from(el.querySelectorAll<HTMLButtonElement>("button"))
  const enabled = focusableButtons(el)
  const active = enabled.find((b) => b.tabIndex === 0)
  for (const b of all) b.tabIndex = -1
  if (enabled.length) (active ?? enabled[0]).tabIndex = 0
}

/**
 * WAI-ARIA APG **toolbar** keyboard behaviour (roving tabindex) for a compact
 * cluster of buttons: the toolbar is a single Tab stop, ←/→ move focus between
 * controls, Home/End jump to the ends (wrapping). Disabled buttons (e.g. undo
 * with nothing to undo) are skipped, and the single tab stop follows the enabled
 * set as buttons appear / disable. Manages `tabIndex` on the buttons imperatively
 * (they render without a `tabIndex` prop, so React never fights it).
 *
 * Spread the returned props onto the `role="toolbar"` element.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 */
export function useRovingToolbar<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    syncTabStops(el)
    // Re-sync when buttons are added/removed or toggle disabled (so the lone tab
    // stop never lands on a removed or now-disabled control). tabIndex writes are
    // excluded from the filter, so our own updates don't re-trigger the observer.
    const observer = new MutationObserver(() => syncTabStops(el))
    observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    })
    return () => observer.disconnect()
  }, [])

  const onKeyDown = useCallback((event: KeyboardEvent<T>) => {
    const el = ref.current
    if (!el) return
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    const buttons = focusableButtons(el)
    if (buttons.length === 0) return

    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next: number
    switch (event.key) {
      case "Home":
        next = 0
        break
      case "End":
        next = buttons.length - 1
        break
      case "ArrowRight":
        next = current < 0 ? 0 : (current + 1) % buttons.length
        break
      default: // ArrowLeft
        next =
          current < 0
            ? buttons.length - 1
            : (current - 1 + buttons.length) % buttons.length
    }
    event.preventDefault()
    for (const b of buttons) b.tabIndex = -1
    buttons[next].tabIndex = 0
    buttons[next].focus()
  }, [])

  return { ref, onKeyDown }
}
