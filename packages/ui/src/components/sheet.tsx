import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import type * as React from "react"
import { Button } from "./button"
import { cn } from "../lib/utils"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          // Border is the SAME overlay mechanism as popover/dialog/dropdown —
          // ring-1 ring-foreground/10 — not a per-side `border`. For an
          // edge-docked sheet the off-screen edges' ring is clipped by the
          // viewport, leaving a crisp hairline on the visible inner edge; for the
          // bottom sheet that hairline reads as a TOP separation in light mode
          // without leaning on a downward shadow. Inner corners are rounded to the
          // large-surface tier (rounded-xl) while the docked edge stays flush.
          "bg-popover ring-foreground/10 fixed z-50 flex flex-col gap-4 bg-clip-padding text-sm shadow-lg ring-1 transition duration-200 ease-in-out outline-none",
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
          "data-[side=right]:data-closed:slide-out-to-right-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=top]:data-closed:slide-out-to-top-10 data-[side=top]:data-open:slide-in-from-top-10 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=bottom]:data-open:slide-in-from-bottom-10",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:rounded-t-xl",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:rounded-b-xl",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:rounded-r-xl data-[side=left]:sm:max-w-sm",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:rounded-l-xl data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {showCloseButton && (
          // Pinned, not absolute-to-the-Popup: a `sticky top-0 h-0` row keeps the
          // close affordance glued to the top of the panel's scroll viewport, so
          // it can never scroll out of view even if a consumer makes the Popup
          // itself (rather than the body region) scroll. The row carries NO height
          // and — crucially — must not introduce a gap before the first real
          // region. Because the Popup is a `flex flex-col gap-*` container, a
          // normal flex child would inherit that column gap regardless of its own
          // height; a consumer that overrides the Popup gap (e.g. `gap-0`) would
          // then see the offset flip and the negative margin eat the header's
          // padding. Removing the row from the flex flow with `absolute inset-x-0
          // top-0` makes its presence — and the close button's placement — fully
          // independent of whatever gap the Popup runs.
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-0 justify-end">
            <SheetPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  variant="ghost"
                  className="pointer-events-auto mt-3 mr-3"
                  size="icon-sm"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          </div>
        )}
        {children}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("gap-0.5 p-4 flex flex-col", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("gap-2 p-4 mt-auto flex flex-col", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
