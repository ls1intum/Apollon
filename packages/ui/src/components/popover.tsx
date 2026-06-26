import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "../lib/utils"

/**
 * Anchor-loss guard for anchored overlays (Popover / Menu / anything backed by
 * Base UI's Positioner).
 *
 * Base UI's Positioner anchors a floating popup to its trigger. When the trigger
 * UNMOUNTS while the overlay is open — e.g. the editor swaps
 * HeaderActionsIsland↔MobileActionsPill across the 768px breakpoint, or a
 * DiagramCard whose "⋮" menu is open gets filtered out — the anchor element
 * detaches from the DOM. `getBoundingClientRect()` on a detached node returns a
 * zero rect at the origin, so Floating UI re-positions the popup to (0,0) and it
 * SNAPS to the top-left corner instead of closing.
 *
 * Base UI already surfaces this: its `hide` middleware flips `referenceHidden`
 * to true for a `{width:0,height:0,x:0,y:0}` reference rect, which lands on the
 * Positioner as `data-anchor-hidden`. Rather than let the popup live on at the
 * corner (its default for a hidden anchor), we observe that attribute on the
 * Positioner node and force the overlay closed via the Root's imperative
 * `actionsRef.close()` — which works whether the consumer drives `open`
 * controlled or uncontrolled.
 *
 * Mirrors the reactive-anchor pattern of the editor's
 * `library/lib/hooks/usePopoverAnchor.ts`: the anchor's liveness drives state,
 * so anchor loss is handled at the primitive instead of leaking corner-snapped
 * popups to every consumer.
 *
 * Returns `positionerRef` — a callback ref to attach to the Positioner —
 * captured in state (not a `useRef().current` read during render) so
 * attaching/detaching the node re-runs the effect that wires up the
 * MutationObserver — plus `actionsRef` for the Root. The hook is exported so the
 * Menu primitive (also Positioner-backed) reuses the exact same guard.
 */
function useAnchorLossGuard(open: boolean): {
  /** Captures the Root's imperative close action so the guard can force a close. */
  actionsRef: React.RefObject<{ close: () => void; unmount: () => void } | null>
  /** Attach to the Positioner so its anchor-hidden state can force a close. */
  positionerRef: React.RefCallback<HTMLDivElement>
} {
  const [positioner, setPositioner] = React.useState<HTMLDivElement | null>(
    null
  )
  const actionsRef = React.useRef<{
    close: () => void
    unmount: () => void
  } | null>(null)

  React.useEffect(() => {
    if (!open || positioner == null) return

    const isHidden = () =>
      positioner.hasAttribute("data-anchor-hidden") ||
      // Belt-and-braces: a detached anchor that Floating UI has not yet
      // re-measured can leave the positioner collapsed at the origin. Treat a
      // zero-size positioner as anchor loss too.
      (positioner.getBoundingClientRect().width === 0 &&
        positioner.getBoundingClientRect().height === 0)

    const check = () => {
      if (isHidden()) actionsRef.current?.close()
    }

    // Initial check in case the anchor was already gone when the popup mounted.
    check()

    const observer = new MutationObserver(check)
    observer.observe(positioner, {
      attributes: true,
      attributeFilter: ["data-anchor-hidden", "style"],
    })

    return () => observer.disconnect()
  }, [open, positioner])

  return { actionsRef, positionerRef: setPositioner }
}

// Shared between the Popover and Menu primitives: the Root captures the
// open/close machinery, the Content's Positioner consumes the guard ref.
// Typed as a plain void-returning callback (not `React.RefCallback`, whose
// React-19 cleanup-return references an internal `@types/react` brand that
// `tsc` can't name in the emitted `.d.ts` — TS4023); a `(node) => void` is
// still a valid `ref` callback at the use site.
const AnchorLossGuardContext = React.createContext<
  ((node: HTMLDivElement | null) => void) | null
>(null)

function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange: onOpenChangeProp,
  ...props
}: PopoverPrimitive.Root.Props) {
  // Track open whether the consumer drives it (controlled) or not (uncontrolled)
  // so the anchor-loss guard always sees the live state. onOpenChange fires in
  // both modes, so this stays in sync without taking ownership of the prop.
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const guard = useAnchorLossGuard(open)
  return (
    <AnchorLossGuardContext.Provider value={guard.positionerRef}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={open}
        actionsRef={guard.actionsRef}
        onOpenChange={(nextOpen, eventDetails) => {
          setUncontrolledOpen(nextOpen)
          onOpenChangeProp?.(nextOpen, eventDetails)
        }}
        {...props}
      />
    </AnchorLossGuardContext.Provider>
  )
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const positionerRef = React.useContext(AnchorLossGuardContext)
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        ref={positionerRef ?? undefined}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}

// Internal — shared with the Menu primitive (dropdown-menu.tsx) so both
// Positioner-backed overlays use the identical anchor-loss guard. Not re-
// exported from the package index.
export { AnchorLossGuardContext, useAnchorLossGuard }
