import React from "react"
import {
  NewDiagramModal,
  ShareModal,
  ShareDashboardModal,
  CollaborateNameModal,
  AboutModal,
  HowToUseModal,
  PPTXExportModal,
} from "@/components/modals"
import {
  ConfirmRestoreModal,
  DeleteVersionModal,
} from "@/components/versioning"
import { versioningStrings as v } from "@/components/versioning/strings"
import { useModalContext } from "@/contexts"
import {
  ModalProgressProvider,
  useModalProgress,
} from "@/contexts/ModalProgressContext"
import { ModalName, ModalProps } from "@/types"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@tumaet/ui/components/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@tumaet/ui/lib/utils"
import { log } from "@/logger"
import {
  getHomeDialogWidth,
  isHomeDialogVariant,
} from "@/components/modals/HomeDialog"

interface ModalWrapperProps {
  name: ModalName
  props?: ModalProps
  closeModal: () => void
}

const MODAL_COMPONENTS: Record<ModalName, React.ComponentType<ModalProps>> = {
  NEW_DIAGRAM: NewDiagramModal,
  SHARE: ShareModal,
  SHARE_DASHBOARD: ShareDashboardModal,
  // These presentational bodies take required props (onClose / onConfirm) that
  // the open-set `ModalProps` index signature can't express, so — like
  // DeleteVersionModal — they're cast through the registry's component type
  // until the deferred ModalProps discriminated union lands.
  COLLABORATE_NAME: CollaborateNameModal as React.ComponentType<unknown>,
  EXPORT_PPTX: PPTXExportModal,
  HowToUseModal: HowToUseModal as React.ComponentType<unknown>,
  AboutModal: AboutModal as React.ComponentType<unknown>,
  DELETE_VERSION: DeleteVersionModal as React.ComponentType<unknown>,
  CONFIRM_RESTORE: ConfirmRestoreModal as React.ComponentType<unknown>,
}

const MODAL_TITLES: Record<ModalName, string> = {
  NEW_DIAGRAM: "New Diagram",
  SHARE: "Share",
  SHARE_DASHBOARD: "Share your diagram",
  COLLABORATE_NAME: "Join Collaboration",
  EXPORT_PPTX: "Export as PPTX",
  HowToUseModal: "How to use this editor?",
  AboutModal: "Information about Apollon",
  DELETE_VERSION: "Delete version",
  CONFIRM_RESTORE: v.confirmRestoreTitle,
}

const ModalProgressBar = () => {
  const { isLoading } = useModalProgress()
  if (!isLoading) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      style={{ transition: "opacity 200ms ease" }}
    >
      <div className="share-modal-progress" />
    </div>
  )
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ name, props }) => {
  const SpecificModal = MODAL_COMPONENTS[name]
  const { closeModal } = useModalContext()
  const isContentOverflow = Boolean(
    props && typeof props === "object" && props.contentOverflow
  )
  const isHomeDialog = isContentOverflow || isHomeDialogVariant(props)
  const isWideHomeDialog = name === "NEW_DIAGRAM" && isHomeDialog
  const isEditorShareDialog = name === "SHARE"

  if (!SpecificModal) {
    log.error(`No modal found for name: ${name}`)
    return null
  }

  const handleClose = () => {
    const onClose =
      props && typeof props === "object" && "onClose" in props
        ? props.onClose
        : undefined

    if (typeof onClose === "function") {
      onClose()
    }

    closeModal()
  }

  return (
    <ModalProgressProvider>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
      >
        {/* Base UI Dialog gives focus trap, scroll lock, Escape + ARIA wiring
            for free. We override the default DialogContent box styling to keep
            the responsive width, accent header, divider and scrollable body the
            modal system has always had. The editor Share dialog and the home
            dialogs size themselves against the safe-area insets so they never
            spill under the iPhone notch / home indicator (#761). */}
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
              ? "min(560px, calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px))"
              : isHomeDialog
                ? getHomeDialogWidth(isWideHomeDialog ? "wide" : "compact")
                : "50vw",
            minWidth: isEditorShareDialog ? 0 : isHomeDialog ? "320px" : "20vw",
            maxWidth:
              "calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px)",
            maxHeight:
              isHomeDialog || isEditorShareDialog
                ? "calc(100dvh - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px) - 24px)"
                : undefined,
          }}
        >
          {/* Header — the shadcn DialogHeader/DialogTitle/DialogClose building
              blocks; the home variant keeps its accent bar + Poppins title and
              the editor variant keeps its divider via the styling below. The
              narrow-screen variant tightens the padding so the header stays out
              of the way on landscape phones. */}
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
                "min-w-0 text-xl leading-tight font-semibold text-primary-foreground",
                isHomeDialog &&
                  "truncate text-[clamp(0.95rem,4vw,1.3rem)] font-medium [font-family:Poppins,sans-serif]"
              )}
            >
              {MODAL_TITLES[name]}
            </DialogTitle>
            <DialogClose
              aria-label="Close"
              className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-primary-foreground transition-colors",
                isHomeDialog
                  ? "hover:bg-[var(--home-on-accent-bg-hover)] hover:text-[var(--home-on-accent-text)]"
                  : "hover:bg-[var(--apollon-background-variant)]"
              )}
            >
              <XIcon className="size-5" aria-hidden />
            </DialogClose>
          </DialogHeader>

          {/* Progress bar — sits between header and content, outside scroll */}
          <ModalProgressBar />

          {/* Scrollable Content. On landscape phones the body padding tightens
              and the cap switches to a safe-area-aware dvh budget so the dialog
              body never runs under the home indicator (#761). */}
          <div
            className={cn(
              "grow",
              isContentOverflow ? "overflow-y-visible" : "overflow-y-auto",
              isHomeDialog
                ? "px-4 pt-6 pb-4 [@media(max-width:950px)_and_(max-height:500px)]:p-3"
                : "p-4 [@media(max-width:950px)_and_(max-height:500px)]:px-3 [@media(max-width:950px)_and_(max-height:500px)]:py-[10px]",
              !isContentOverflow &&
                "[@media(max-width:950px)_and_(max-height:500px)]:max-h-[calc(100dvh-var(--safe-area-inset-top,0px)-var(--safe-area-inset-bottom,0px)-64px)]"
            )}
            style={{
              maxHeight: isContentOverflow
                ? "none"
                : isHomeDialog
                  ? "calc(92vh - 84px)"
                  : "calc(90vh - 60px)",
            }}
          >
            {/* The presentational modal bodies report dismissal through an
                `onClose` callback instead of reaching into the modal context.
                We wire it to `closeModal` *after* spreading the caller props so
                a caller-supplied `onClose` (consumed above by `handleClose` for
                dialog-level dismissal) never shadows the body's close action. */}
            <SpecificModal {...props} onClose={closeModal} />
          </div>
        </DialogContent>
      </Dialog>
    </ModalProgressProvider>
  )
}
