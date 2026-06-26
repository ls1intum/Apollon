import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@tumaet/ui/components/dialog"
import { cn } from "@tumaet/ui/lib/utils"
import { getHomeDialogWidth } from "@/components/modals/HomeDialog"

/**
 * The shared modal chrome — the open Base UI {@link Dialog} plus the responsive
 * {@link DialogContent} box every Apollon modal is presented in. The app **and**
 * the Storybook stories render modal bodies in this same frame (single source of
 * truth — no duplicated chrome).
 *
 * ModalFrame **styles** the canonical `DialogContent`: it keeps the primitive's
 * `bg-popover`, `rounded-xl`, ring, shadow and default close button, and only
 * adds the per-variant responsive width + the title row. It does NOT fork the
 * surface or hand-roll a close — so every modal reads as one system, matching
 * the AlertDialog used by `DiagramCard`.
 *
 * LAYOUT CONTRACT — the DialogContent is `flex flex-col` and clamped to the
 * visual viewport. It has EXACTLY three children:
 *   1. the header (`shrink-0`, divided by a tokened bottom border),
 *   2. the scrollable BODY (`min-h-0 flex-1 overflow-y-auto`) — the ONLY part
 *      that scrolls, so the footer never sinks below the fold, and
 *   3. the FOOTER, a sibling AFTER the body so it pins to the dialog's true
 *      bottom edge in portrait.
 *
 * The footer is filled either by the `footer` prop OR by a body that renders
 * `HomeDialogActions`: those actions portal into the {@link ModalFooterSlot}
 * exposed here via context, so EVERY modal's action bar lands in the pinned
 * footer slot without the body emitting a `DialogFooter` inside the scroll
 * region. When no frame is present (standalone Storybook blocks) the actions
 * fall back to rendering in flow.
 *
 * Variants only differ in width / safe-area handling:
 * - `home-wide` / `home-compact` — the home dialogs (New Diagram is wide;
 *   Share-dashboard / Collaborate are compact).
 * - `editor-share` — the editor Share dialog (560px, safe-area aware so it
 *   clears the iPhone notch, #761).
 * - `plain` — the content utility dialogs (About / How-to / PPTX): roomier
 *   fixed width.
 * - `confirm` — compact single-action / single-field dialogs (delete, restore,
 *   join-collaboration): narrow fixed width.
 */
export type ModalVariant =
  | "home-wide"
  | "home-compact"
  | "editor-share"
  | "plain"
  | "confirm"

/**
 * The footer-slot contract. ModalFrame publishes the DOM node of its pinned
 * footer region; `HomeDialogActions` reads it and portals its action bar there
 * (so the bar sits OUTSIDE the scroll body, pinned to the dialog bottom). A
 * `null` element means "no frame" (standalone story) — consumers then render in
 * flow. `setHasFooterContent` lets a portalling consumer tell the frame the
 * footer is filled, so the frame can paint the footer chrome (border/tint) only
 * when something actually lands there.
 */
type ModalFooterSlot = {
  element: HTMLElement | null
  setHasFooterContent: (has: boolean) => void
}

const ModalFooterSlotContext = createContext<ModalFooterSlot | null>(null)

/**
 * Read the footer slot exposed by the surrounding {@link ModalFrame}. Returns
 * `null` outside a frame (e.g. a standalone Storybook block) so the caller can
 * fall back to in-flow rendering.
 */
export function useModalFooterSlot(): ModalFooterSlot | null {
  return useContext(ModalFooterSlotContext)
}

/**
 * Portals `children` into the surrounding {@link ModalFrame}'s pinned footer
 * slot. Outside a frame it renders the children in place (Storybook fallback).
 * Tells the frame whether the footer is filled so the frame paints its chrome
 * only when content lands there.
 */
export function ModalFooterPortal({ children }: { children: ReactNode }) {
  const slot = useModalFooterSlot()
  const target = slot?.element ?? null
  const setHasFooterContent = slot?.setHasFooterContent
  const hasContent = children != null && children !== false

  // Tell the frame the footer is filled (so it paints the gutter) in a commit
  // effect — never during render — and clear the flag on unmount so closing a
  // modal doesn't leave a stale gutter behind.
  useEffect(() => {
    if (!target || !setHasFooterContent) return
    setHasFooterContent(hasContent)
    return () => setHasFooterContent(false)
  }, [target, setHasFooterContent, hasContent])

  // Outside a frame, render in flow.
  if (!target) return <>{children}</>

  return createPortal(children, target)
}

export function ModalFrame({
  title,
  variant,
  contentOverflow = false,
  onOpenChange,
  beforeBody,
  footer,
  children,
}: {
  title: string
  variant: ModalVariant
  contentOverflow?: boolean
  onOpenChange?: (open: boolean) => void
  /** Rendered between the header and the scrollable body (e.g. a progress bar). */
  beforeBody?: ReactNode
  /**
   * Rendered in the pinned footer slot (a sibling AFTER the scroll body). Most
   * modals leave this empty and let their body's `HomeDialogActions` portal
   * here instead; pass it directly only when the frame itself owns the actions.
   */
  footer?: ReactNode
  children: ReactNode
}) {
  const isEditorShareDialog = variant === "editor-share"
  const isConfirmDialog = variant === "confirm"
  const isHomeDialog =
    (variant !== "plain" && variant !== "confirm") || contentOverflow
  const isWideHomeDialog = variant === "home-wide"
  // Fixed, viewport-clamped widths (never raw vw — modals shouldn't balloon on
  // large monitors). Confirms are narrow; content utility dialogs are roomier.
  const insetClamp =
    "calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px)"

  // The pinned footer DOM node, published to bodies via context so their
  // `HomeDialogActions` portal into it (see ModalFooterPortal). Tracked in state
  // so the portal subscribes once the node mounts.
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null)
  const [hasPortalFooter, setHasPortalFooter] = useState(false)

  const footerFilled = footer != null || hasPortalFooter

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* Base UI Dialog gives focus trap, scroll lock, Escape + ARIA wiring for
          free. We keep the canonical DialogContent surface (bg-popover,
          rounded-xl, ring, shadow, default close button) and only override its
          width + max-height so it stays responsive and clears the iPhone
          safe-area insets (#761) — no forked surface, no hand-rolled close.

          The surface is a flex column clamped to the visual viewport; its three
          children (header / scroll body / footer) divide that budget so the
          footer always pins to the bottom edge — never below the fold. */}
      <DialogContent
        className="flex max-h-[calc(100dvh-var(--safe-area-inset-top,0px)-var(--safe-area-inset-bottom,0px)-24px)] max-w-none flex-col gap-0 overflow-hidden p-0"
        style={{
          width: isEditorShareDialog
            ? `min(560px, ${insetClamp})`
            : isHomeDialog
              ? getHomeDialogWidth(isWideHomeDialog ? "wide" : "compact")
              : isConfirmDialog
                ? `min(440px, ${insetClamp})`
                : `min(600px, ${insetClamp})`,
          minWidth: isHomeDialog ? "320px" : 0,
          maxWidth:
            "calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px)",
        }}
      >
        {/* (1) Header — the canonical DialogHeader / DialogTitle, tokened
            bottom border. The default close button rendered by DialogContent
            sits top-right, so the title row reserves space for it. */}
        <DialogHeader className="shrink-0 border-b border-border p-4 pr-12">
          <DialogTitle className="min-w-0 truncate">{title}</DialogTitle>
        </DialogHeader>

        {beforeBody}

        {/* (2) Scrollable body — the ONLY scroll region. `min-h-0 flex-1` lets
            it absorb the leftover height under the clamped DialogContent, so the
            footer below never sinks below the fold in portrait. */}
        <div
          className={cn(
            "min-h-0 flex-1 p-4",
            contentOverflow ? "overflow-y-visible" : "overflow-y-auto"
          )}
        >
          <ModalFooterSlotContext.Provider
            value={{
              element: footerEl,
              setHasFooterContent: setHasPortalFooter,
            }}
          >
            {children}
          </ModalFooterSlotContext.Provider>
        </div>

        {/* (3) Footer — a sibling AFTER the body. The slot reproduces the body's
            `p-4` box so DialogFooter's `-mx-4 -mb-4 rounded-b-xl border-t
            bg-muted/50` pulls back to the dialog's true bottom edge (full-bleed
            tinted bar, rounded to match the popup). The node is always mounted
            (bodies portal into it); the `p-4` gutter is added only when the
            footer is filled, so an empty footer adds no chrome. */}
        <div
          ref={setFooterEl}
          className={cn("shrink-0", footerFilled && "p-4")}
        >
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  )
}
