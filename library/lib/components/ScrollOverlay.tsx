import React, { useEffect, useState, useRef } from "react"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

/**
 * ScrollOverlay Component
 * Displays an overlay when user tries to scroll but scrollLock is enabled.
 * Press Space to temporarily unlock scrolling.
 */
export const ScrollOverlay: React.FC = () => {
  const { scrollLock, scrollEnabled, setScrollEnabled } = useMetadataStore(
    useShallow((state) => ({
      scrollLock: state.scrollLock,
      scrollEnabled: state.scrollEnabled,
      setScrollEnabled: state.setScrollEnabled,
    }))
  )

  const [showOverlay, setShowOverlay] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle Space key to temporarily enable scrolling
  useEffect(() => {
    if (!scrollLock) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setScrollEnabled(true)
        setShowOverlay(false)
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setScrollEnabled(false)
      }
    }

    // Show overlay when user tries to scroll with mouse wheel
    const handleWheel = () => {
      setShowOverlay(true)

      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      // Hide overlay after 500ms of no scroll attempts
      hideTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false)
        hideTimeoutRef.current = null
      }, 500)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("wheel", handleWheel, { passive: true })

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("wheel", handleWheel)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [scrollLock, setScrollEnabled])

  if (!scrollLock || !showOverlay || scrollEnabled) return null

  return (
    <div className="scroll-overlay" role="presentation">
      <div className="scroll-overlay-hint">
        <div className="scroll-overlay-hint-content">
          <p className="scroll-overlay-hint-text">
            Hold &quot;CtrlLeft&quot; + scroll to zoom the editor.
          </p>
        </div>
      </div>
    </div>
  )
}
