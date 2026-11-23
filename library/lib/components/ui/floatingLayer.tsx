import {
  createContext,
  use,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

/**
 * Where the editor's floating surfaces — popovers, selects, pickers, tooltips
 * and the palette drag ghost — render, and how they are positioned there.
 *
 * Embedded on an ordinary page they portal to `document.body`, which keeps them
 * clear of every `overflow` and `transform` the host wraps around the editor.
 * Inside a host's modal layer they stay in this editor's own portal root instead,
 * because nothing outside that layer is reachable there:
 *
 * - a native `<dialog>` opened with `showModal()`, an open `popover` and a
 *   fullscreen element sit in the browser's top layer, which paints above any
 *   `z-index` and, for a modal dialog, makes the rest of the page inert;
 * - an `aria-modal="true"` dialog (PrimeNG, Angular CDK, Bootstrap, MUI, Radix,
 *   Base UI…) tells assistive technology to ignore everything outside it, and the
 *   focus trap most of them run pulls focus back out of a popover rendered there.
 */
export interface ApollonFloatingLayer {
  /** The element a floating surface portals into. */
  container: HTMLElement
  /**
   * The CSS positioning a surface uses in {@link container}. `fixed` inside the
   * editor so `overflow: hidden` on the editor or a host wrapper cannot clip it;
   * `absolute` on the body, where nothing clips it.
   */
  positionMethod: "absolute" | "fixed"
}

/**
 * The class every floating surface puts on its positioned root (the Base UI
 * `Positioner`, or the drag ghost itself). The stacking order lives on that
 * element because the positioner is placed with `transform`, which makes it a
 * stacking context: a `z-index` on anything inside it only orders the surface
 * against its own children, never against the host page.
 */
export const FLOATING_SURFACE_CLASS = "apollon-floating-surface"

interface PortalContainerContextValue {
  portalContainer: HTMLElement | null
  setPortalContainer: (container: HTMLDivElement | null) => void
}

const ApollonPortalContainerContext =
  createContext<PortalContainerContextValue | null>(null)

/**
 * Owns one layout-neutral portal destination for a single editor instance.
 * Keeping the root in React's tree makes its lifetime match the editor and
 * prevents one editor's modal host from capturing another editor's surfaces.
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
 * Host ancestors that confine interaction to their own subtree. Each entry is
 * probed on its own, so an engine without `:modal` or `:popover-open` still
 * honours the rest; an engine that cannot parse one cannot create that layer.
 */
const MODAL_LAYER_SELECTORS = [
  '[aria-modal="true"]',
  "dialog:modal",
  "[popover]:popover-open",
] as const

let modalLayerSelector: string | undefined

function getModalLayerSelector(ownerDocument: Document): string {
  if (modalLayerSelector === undefined) {
    const probe = ownerDocument.createElement("div")
    modalLayerSelector = MODAL_LAYER_SELECTORS.filter((selector) => {
      try {
        probe.matches(selector)
        return true
      } catch {
        return false
      }
    }).join(", ")
  }
  return modalLayerSelector
}

/** Whether `element` sits inside a layer that the body cannot paint over or reach. */
export function isInsideModalLayer(element: Element): boolean {
  const ownerDocument = element.ownerDocument
  const fullscreenElement = ownerDocument.fullscreenElement
  // Document-root fullscreen keeps the body inside the top layer, so the body
  // portal stays visible there; only a subtree fullscreen strands it.
  if (
    fullscreenElement != null &&
    !fullscreenElement.contains(ownerDocument.body) &&
    fullscreenElement.contains(element)
  ) {
    return true
  }
  const selector = getModalLayerSelector(ownerDocument)
  return selector !== "" && element.closest(selector) !== null
}

const layerListeners = new Set<() => void>()
const notifyLayerListeners = () => {
  for (const listener of layerListeners) listener()
}

// Fullscreen changes announce themselves on the document. A popover or dialog
// opening or closing fires a non-bubbling `toggle` on itself, which a capturing
// document listener still sees. Anything else is picked up on the surface's next
// render: the snapshot is read from the DOM every time, and opening a surface
// always renders it.
function subscribeToLayerChanges(listener: () => void): () => void {
  layerListeners.add(listener)
  if (layerListeners.size === 1) {
    document.addEventListener("fullscreenchange", notifyLayerListeners)
    document.addEventListener("toggle", notifyLayerListeners, true)
  }
  return () => {
    layerListeners.delete(listener)
    if (layerListeners.size === 0) {
      document.removeEventListener("fullscreenchange", notifyLayerListeners)
      document.removeEventListener("toggle", notifyLayerListeners, true)
    }
  }
}

const getServerSnapshot = () => null

/**
 * The floating layer for the calling editor. Re-renders when the editor moves
 * into or out of a modal layer, re-portaling surfaces that are already open.
 */
export function useApollonFloatingLayer(): ApollonFloatingLayer {
  const portalRoot = use(ApollonPortalContainerContext)?.portalContainer ?? null
  const localRoot = useSyncExternalStore(
    subscribeToLayerChanges,
    () => (portalRoot && isInsideModalLayer(portalRoot) ? portalRoot : null),
    getServerSnapshot
  )

  return useMemo(
    () =>
      localRoot
        ? { container: localRoot, positionMethod: "fixed" }
        : { container: document.body, positionMethod: "absolute" },
    [localRoot]
  )
}

/**
 * Props for a Base UI `Positioner` in this layer. Spread them before the
 * surface's own placement props.
 */
export function floatingPositionerProps(layer: ApollonFloatingLayer): {
  className: string
  positionMethod: ApollonFloatingLayer["positionMethod"]
} {
  return {
    className: FLOATING_SURFACE_CLASS,
    positionMethod: layer.positionMethod,
  }
}
