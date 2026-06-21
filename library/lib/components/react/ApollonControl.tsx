import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useApollonEditor } from "./context"
import { RegionMount } from "../../overlay/RegionMount"
import { type OverlayControlOptions } from "../../overlay/types"

/** Props for {@link ApollonControl}: every {@link OverlayControlOptions} field
 *  (id, region, inset, order, …) plus the children to render in-canvas. */
export type ApollonControlProps = OverlayControlOptions & {
  /** Portaled into the control's host node inside the chosen region. Children
   *  changes never re-register the control; only real option changes do. */
  children: ReactNode
}

/** Stable signature of the non-children options, so an option change
 *  re-registers but a children change doesn't. */
function serializeOptions(o: OverlayControlOptions): string {
  return JSON.stringify({
    region: o.region,
    order: o.order ?? null,
    interactive: o.interactive ?? null,
    groupLabel: o.groupLabel ?? null,
    inset: o.inset ?? null,
    visible: o.visible ?? null,
    className: o.className ?? null,
    style: o.style ?? null,
  })
}

/**
 * Declarative façade over `editor.addControl`. Registers a control that renders
 * a stable host node into the chosen region, and portals `children` into that
 * node — so children render INSIDE the canvas while React owns their
 * reconciliation. Children changes therefore never touch the overlay store; only
 * real option changes (region/inset/order/…) push an update. Returns null in the
 * host tree.
 */
export function ApollonControl({
  children,
  ...options
}: ApollonControlProps): ReactNode {
  // Nullable: the imperative editor mounts asynchronously.
  const editor = useApollonEditor()
  const [host] = useState<HTMLDivElement | null>(() =>
    typeof document !== "undefined" ? document.createElement("div") : null
  )

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // Register once per id once the editor + host node exist.
  useEffect(() => {
    if (!editor || !host) return
    const dispose = editor.addControl({
      ...optionsRef.current,
      render: () => <RegionMount el={host} />,
    })
    return dispose
  }, [editor, host, options.id])

  // Push real option changes to the store (NOT on every children render) —
  // keyed by a serialized signature of the non-children options.
  const sig = serializeOptions(options)
  useEffect(() => {
    if (!editor || !host) return
    editor.updateControl(options.id, {
      ...optionsRef.current,
      render: () => <RegionMount el={host} />,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, host, options.id, sig])

  return host ? createPortal(children, host) : null
}
