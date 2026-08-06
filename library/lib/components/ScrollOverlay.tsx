import React, { useCallback, useEffect, useRef, useState } from "react"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useLabels } from "@/i18n/useLabels"

/**
 * Scroll lock: a wheel gesture over the canvas scrolls the PAGE, and only zooms
 * the diagram while the platform's zoom modifier is held. An editor embedded
 * mid-document must not swallow the reader's scroll — the same contract Google
 * Maps uses for an embedded map, and the reason it tells you which key to hold
 * rather than silently doing nothing.
 *
 * The hint appears only in response to a gesture the lock actually blocked, and
 * disappears on its own. It is not a dialog and takes no focus: it explains what
 * just happened, it does not ask for anything.
 */

/** Display-only. A wrong guess costs a glyph, never a shortcut — both keys work. */
const zoomModifierCap = (): string =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipod|ipad/i.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl"

const HINT_LINGER_MS = 1200

export const ScrollOverlay: React.FC = () => {
  const { scrollLock, scrollEnabled, setScrollEnabled } = useMetadataStore(
    useShallow((state) => ({
      scrollLock: state.scrollLock,
      scrollEnabled: state.scrollEnabled,
      setScrollEnabled: state.setScrollEnabled,
    }))
  )
  const t = useLabels()

  const [showHint, setShowHint] = useState(false)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const clearHide = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
      hideTimeout.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof matchMedia === "undefined") return
    const query = matchMedia("(pointer: coarse)")
    const sync = () => setCoarsePointer(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!scrollLock) return
    const root = rootRef.current?.closest(".apollon-editor")
    if (!root) return

    // `event.ctrlKey` is already false in the keyup that RELEASES Ctrl, so the
    // old `if (e.ctrlKey) unlock()` never fired and the canvas stayed unlocked
    // for the rest of the session. Track the key itself, and treat anything that
    // can strand a held modifier — losing focus, the window going away — as a
    // release, so the lock can never be left open.
    const isZoomModifier = (key: string) =>
      key === "Control" || key === "Meta" || key === "OS"

    const unlock = () => {
      setScrollEnabled(true)
      setShowHint(false)
      clearHide()
    }
    const relock = () => setScrollEnabled(false)

    const onKeyDown = (event: Event) => {
      const { key, repeat } = event as KeyboardEvent
      if (!repeat && isZoomModifier(key)) unlock()
    }
    const onKeyUp = (event: Event) => {
      if (isZoomModifier((event as KeyboardEvent).key)) relock()
    }
    const onWheel = (event: Event) => {
      // A modifier-held wheel is a zoom, not a blocked scroll: say nothing.
      const { ctrlKey, metaKey } = event as WheelEvent
      if (ctrlKey || metaKey) return
      setShowHint(true)
      clearHide()
      hideTimeout.current = setTimeout(() => {
        setShowHint(false)
        hideTimeout.current = null
      }, HINT_LINGER_MS)
    }

    // Keys are listened for on the window: the modifier is usually pressed
    // before the pointer ever focuses the canvas, and a keyup can land after
    // focus has moved on.
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", relock)
    root.addEventListener("wheel", onWheel, { passive: true })

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", relock)
      root.removeEventListener("wheel", onWheel)
      clearHide()
      // Never leave a torn-down editor's lock released.
      relock()
    }
  }, [scrollLock, setScrollEnabled, clearHide])

  // The root stays mounted so the effect above can find its editor; only the
  // hint itself comes and goes.
  const visible = scrollLock && showHint && !scrollEnabled

  return (
    <div
      ref={rootRef}
      className={`scroll-overlay${visible ? " scroll-overlay--visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {visible && (
        <p className="scroll-overlay__hint">
          {coarsePointer
            ? t.scrollLockHintTouch
            : t.scrollLockHint(zoomModifierCap())}
        </p>
      )}
    </div>
  )
}
