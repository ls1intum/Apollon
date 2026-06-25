import type { ReactNode } from "react"
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
 * {@link DialogContent} box every Apollon modal is presented in. Extracted from
 * `ModalWrapper` so the app **and** the Storybook stories render modal bodies in
 * the exact same frame (single source of truth — no duplicated chrome).
 *
 * ModalFrame **styles** the canonical `DialogContent`: it keeps the primitive's
 * `bg-popover`, `rounded-xl`, ring, shadow and default close button, and only
 * adds the per-variant responsive width + the title row. It does NOT fork the
 * surface or hand-roll a close — so every modal reads as one system, matching
 * the AlertDialog used by `DiagramCard`.
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

export function ModalFrame({
  title,
  variant,
  contentOverflow = false,
  onOpenChange,
  beforeBody,
  children,
}: {
  title: string
  variant: ModalVariant
  contentOverflow?: boolean
  onOpenChange?: (open: boolean) => void
  /** Rendered between the header and the scrollable body (e.g. a progress bar). */
  beforeBody?: ReactNode
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

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* Base UI Dialog gives focus trap, scroll lock, Escape + ARIA wiring for
          free. We keep the canonical DialogContent surface (bg-popover,
          rounded-xl, ring, shadow, default close button) and only override its
          width + max-height so it stays responsive and clears the iPhone
          safe-area insets (#761) — no forked surface, no hand-rolled close. */}
      <DialogContent
        className={cn(
          "flex max-w-none flex-col gap-0 overflow-hidden p-0",
          !isHomeDialog && !isEditorShareDialog && "max-h-[90vh]"
        )}
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
          maxHeight:
            isHomeDialog || isEditorShareDialog
              ? "calc(100dvh - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px) - 24px)"
              : undefined,
        }}
      >
        {/* Header — the canonical DialogHeader / DialogTitle. The default close
            button rendered by DialogContent sits top-right, so the title row
            reserves space for it. The narrow-screen variant tightens the
            padding so the header stays out of the way on landscape phones. */}
        <DialogHeader className="border-b p-4 pr-12 [@media(max-width:950px)_and_(max-height:500px)]:px-3 [@media(max-width:950px)_and_(max-height:500px)]:py-2">
          <DialogTitle className="min-w-0 truncate">{title}</DialogTitle>
        </DialogHeader>

        {beforeBody}

        {/* Scrollable content. On landscape phones the body padding tightens and
            the cap switches to a safe-area-aware dvh budget so the dialog body
            never runs under the home indicator (#761). */}
        <div
          className={cn(
            "grow",
            contentOverflow ? "overflow-y-visible" : "overflow-y-auto",
            "p-4 [@media(max-width:950px)_and_(max-height:500px)]:px-3 [@media(max-width:950px)_and_(max-height:500px)]:py-[10px]",
            !contentOverflow &&
              "[@media(max-width:950px)_and_(max-height:500px)]:max-h-[calc(100dvh-var(--safe-area-inset-top,0px)-var(--safe-area-inset-bottom,0px)-64px)]"
          )}
          style={{
            maxHeight: contentOverflow
              ? "none"
              : isHomeDialog
                ? "calc(92vh - 84px)"
                : "calc(90vh - 60px)",
          }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
