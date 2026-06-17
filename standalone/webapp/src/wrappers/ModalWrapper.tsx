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
import { DeleteVersionModal } from "@/components/versioning"
import { useModalContext } from "@/contexts"
import {
  ModalProgressProvider,
  useModalProgress,
} from "@/contexts/ModalProgressContext"
import { ModalName, ModalProps } from "@/types"
import {
  Dialog,
  DialogContent,
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
  COLLABORATE_NAME: CollaborateNameModal,
  EXPORT_PPTX: PPTXExportModal,
  HowToUseModal: HowToUseModal,
  AboutModal: AboutModal,
  DELETE_VERSION: DeleteVersionModal as React.ComponentType<unknown>,
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
            modal system has always had. */}
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex max-w-none flex-col gap-0 overflow-hidden p-0",
            isHomeDialog
              ? "max-h-[92vh] rounded-[15px] bg-background"
              : "max-h-[90vh] rounded-md bg-[var(--apollon-background)]"
          )}
          style={
            isHomeDialog
              ? {
                  width: getHomeDialogWidth(
                    isWideHomeDialog ? "wide" : "compact"
                  ),
                  minWidth: "320px",
                }
              : { width: "50vw", minWidth: "20vw", maxWidth: "90vw" }
          }
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between gap-2",
              isHomeDialog
                ? "rounded-t-[15px] bg-primary px-5 py-[18px]"
                : "p-4"
            )}
          >
            <DialogTitle
              className={cn(
                "min-w-0 text-xl leading-tight font-semibold",
                isHomeDialog
                  ? "truncate text-[clamp(0.95rem,4vw,1.3rem)] font-medium text-primary-foreground [font-family:Poppins,sans-serif]"
                  : "text-[var(--apollon-primary-contrast)]"
              )}
            >
              {MODAL_TITLES[name]}
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center p-1 transition-colors",
                isHomeDialog
                  ? "rounded-md text-primary-foreground hover:bg-[var(--home-on-accent-bg-hover)] hover:text-[var(--home-on-accent-text)]"
                  : "rounded-sm text-[var(--apollon-primary-contrast)] hover:bg-[var(--apollon-background-variant)]"
              )}
            >
              <XIcon className="size-5" aria-hidden />
            </button>
          </div>
          {!isHomeDialog && (
            <div className="h-px w-full bg-[var(--apollon-background-variant)]" />
          )}

          {/* Progress bar — sits between header and content, outside scroll */}
          <ModalProgressBar />

          {/* Scrollable Content */}
          <div
            className={cn(
              "grow",
              isContentOverflow ? "overflow-y-visible" : "overflow-y-auto",
              isHomeDialog ? "px-4 pt-6 pb-4" : "p-4"
            )}
            style={{
              maxHeight: isContentOverflow
                ? "none"
                : isHomeDialog
                  ? "calc(92vh - 84px)"
                  : "calc(90vh - 60px)",
            }}
          >
            <SpecificModal {...props} />
          </div>
        </DialogContent>
      </Dialog>
    </ModalProgressProvider>
  )
}
