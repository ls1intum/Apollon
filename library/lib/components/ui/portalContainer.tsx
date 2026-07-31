import {
  createContext,
  use,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

interface PortalContainerContextValue {
  portalContainer: HTMLElement | null
  setPortalContainer: (container: HTMLDivElement | null) => void
}

const ApollonPortalContainerContext =
  createContext<PortalContainerContextValue | null>(null)

const fullscreenListeners = new Set<() => void>()
const notifyFullscreenListeners = () => {
  for (const listener of fullscreenListeners) listener()
}

function subscribeToFullscreen(listener: () => void): () => void {
  fullscreenListeners.add(listener)
  if (fullscreenListeners.size === 1) {
    document.addEventListener("fullscreenchange", notifyFullscreenListeners)
  }
  return () => {
    fullscreenListeners.delete(listener)
    if (fullscreenListeners.size === 0) {
      document.removeEventListener(
        "fullscreenchange",
        notifyFullscreenListeners
      )
    }
  }
}

/**
 * Owns one layout-neutral portal destination for a single editor instance.
 * Keeping the root in React's tree makes its lifetime match the editor and
 * prevents fullscreen in one editor from capturing another editor's surfaces.
 */
export function ApollonPortalContainerProvider({
  children,
}: {
  children: ReactNode
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  )
  const context = useMemo(
    () => ({ portalContainer, setPortalContainer }),
    [portalContainer]
  )

  return (
    <ApollonPortalContainerContext value={context}>
      {children}
    </ApollonPortalContainerContext>
  )
}

/** Declarative root rendered inside the editor's own stacking context. */
export function ApollonPortalRoot() {
  const context = use(ApollonPortalContainerContext)
  return (
    <div
      ref={context?.setPortalContainer}
      className="apollon-editor__portal-root"
      data-apollon-portal-root=""
    />
  )
}

/**
 * Returns body whenever it remains in the browser's fullscreen subtree. For
 * element-level fullscreen that excludes body, it returns this editor's local
 * root instead. The subscription re-portals already-open surfaces when
 * fullscreen changes.
 */
export function useApollonPortalContainer(): HTMLElement {
  const portalContainer =
    use(ApollonPortalContainerContext)?.portalContainer ?? null
  const fullscreenElement = useSyncExternalStore(
    subscribeToFullscreen,
    () => document.fullscreenElement ?? null,
    () => null
  )

  const bodyExcludedFromFullscreen =
    fullscreenElement != null && !fullscreenElement.contains(document.body)
  if (
    portalContainer &&
    bodyExcludedFromFullscreen &&
    fullscreenElement.contains(portalContainer)
  ) {
    return portalContainer
  }
  return document.body
}
