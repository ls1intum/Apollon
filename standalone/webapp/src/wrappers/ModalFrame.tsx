import type { ReactNode } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@tumaet/ui/components/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@tumaet/ui/lib/utils"
import { getHomeDialogWidth } from "@/components/modals/HomeDialog"

/**
 * The authentic modal chrome — the open Base UI {@link Dialog} plus the
 * responsive {@link DialogContent} box, accent/divider header and scrollable
 * body that every Apollon modal is presented in. Extracted from `ModalWrapper`
 * so the app **and** the Storybook stories render modal bodies in the exact same
 * frame (single source of truth — no duplicated chrome).
 *
 * Variants mirror how modals are actually opened:
 * - `home-wide` / `home-compact` — the home dialogs (accent header, Poppins
 *   title, rounded surface). New Diagram is wide; Share-dashboard/Collaborate are
 *   compact.
 * - `editor-share` — the editor Share dialog (accent header, 560px, safe-area
 *   aware so it clears the iPhone notch, #761).
 * - `plain` — the content utility dialogs (About / How-to / PPTX): divider
 *   header, neutral surface, fixed comfortable width.
 * - `confirm` — compact single-action / single-field dialogs (delete, restore,
 *   join-collaboration): divider header, narrow fixed width.
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
          free. We override the default DialogContent box styling to keep the
          responsive width, accent header, divider and scrollable body the modal
          system has always had. The editor Share dialog and the home dialogs
          size themselves against the safe-area insets so they never spill under
          the iPhone notch / home indicator (#761). */}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-w-none flex-col gap-0 overflow-hidden p-0",
          isHomeDialog
            ? "rounded-[15px] bg-[var(--home-surface-base)]"
            : "rounded-md bg-background",
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
        {/* Header — the shadcn DialogHeader/DialogTitle/DialogClose building
            blocks; the home variant keeps its accent bar + Poppins title and the
            editor variant keeps its divider. The narrow-screen variant tightens
            the padding so the header stays out of the way on landscape phones. */}
        <DialogHeader
          className={cn(
            "flex-row items-center justify-between gap-2",
            isHomeDialog
              ? "rounded-t-[15px] bg-primary px-5 py-[18px] [@media(max-width:950px)_and_(max-height:500px)]:px-[14px] [@media(max-width:950px)_and_(max-height:500px)]:py-[10px]"
              : "border-b border-b-[var(--apollon-background-variant)] p-4 [@media(max-width:950px)_and_(max-height:500px)]:px-3 [@media(max-width:950px)_and_(max-height:500px)]:py-2"
          )}
        >
          <DialogTitle
            className={cn(
              "min-w-0 text-xl leading-tight font-semibold",
              // Accent header = white-on-navy title; plain/divider header (white
              // surface) = dark body text.
              isHomeDialog
                ? "truncate text-[clamp(0.95rem,4vw,1.3rem)] font-medium text-primary-foreground"
                : "text-foreground"
            )}
          >
            {title}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className={cn(
              "flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 transition-colors",
              isHomeDialog
                ? "text-primary-foreground hover:bg-[var(--home-on-accent-bg-hover)] hover:text-[var(--home-on-accent-text)]"
                : "text-foreground hover:bg-[var(--apollon-background-variant)]"
            )}
          >
            <XIcon className="size-5" aria-hidden />
          </DialogClose>
        </DialogHeader>

        {beforeBody}

        {/* Scrollable Content. On landscape phones the body padding tightens and
            the cap switches to a safe-area-aware dvh budget so the dialog body
            never runs under the home indicator (#761). */}
        <div
          className={cn(
            "grow",
            contentOverflow ? "overflow-y-visible" : "overflow-y-auto",
            isHomeDialog
              ? "px-4 pt-6 pb-4 [@media(max-width:950px)_and_(max-height:500px)]:p-3"
              : "p-4 [@media(max-width:950px)_and_(max-height:500px)]:px-3 [@media(max-width:950px)_and_(max-height:500px)]:py-[10px]",
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
