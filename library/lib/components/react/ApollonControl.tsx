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

  // Signature of the non-children options; an option change re-applies, a
  // children-only render does not (children reconcile through the portal).
  const sig = serializeOptions(options)
  // Tracks the signature last written to the store, so registration and the
  // option-change effect never both write on the same render (a mount, or the
  // editor resolving from null, runs both — without this guard that is a
  // redundant register + computeInsets).
  const appliedSig = useRef<string | null>(null)

  useEffect(() => {
    if (!editor || !host) return
    appliedSig.current = sig
    return editor.addControl({
      ...optionsRef.current,
      render: () => <RegionMount el={host} />,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, host, options.id])

  useEffect(() => {
    if (!editor || !host || appliedSig.current === sig) return
    appliedSig.current = sig
    editor.updateControl(options.id, {
      ...optionsRef.current,
      render: () => <RegionMount el={host} />,
    })
  }, [editor, host, options.id, sig])

  return host ? createPortal(children, host) : null
}
