import { useLayoutEffect, useRef } from "react"

/**
 * Mounts a host-owned DOM node (returned by `editor.getRegionElement`) into an
 * overlay region. The node's lifetime is the editor instance, not this React
 * subtree, so a host `createPortal` target stays valid across re-renders. The
 * host renders into the node from its OWN React root, keeping host context
 * (theme tokens, router) — see ApollonEditor.getRegionElement.
 */
export function RegionMount({ el }: { el: HTMLElement }) {
  const hostRef = useRef<HTMLDivElement>(null)
  // The overlay layer measures its regions in a parent layout effect. Attach
  // host-owned content in the child's layout phase so that first measurement
  // sees the real dimensions instead of the empty pass-through mount.
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.appendChild(el)
    return () => {
      if (el.parentNode === host) host.removeChild(el)
    }
  }, [el])
  return <div ref={hostRef} style={{ display: "contents" }} />
}
