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
import { log } from "@/logger"
import { isHomeDialogVariant } from "@/components/modals/HomeDialog"
import { ModalFrame, type ModalVariant } from "./ModalFrame"

interface ModalWrapperProps {
  name: ModalName
  props?: ModalProps
  closeModal: () => void
}

// Each modal keeps its own real props type. The registry only asserts that
// every `ModalName` maps to *some* component (exhaustive + no stray names)
// without widening any entry to `ComponentType<ModalProps>` — so e.g.
// `ShareDashboardModal` can be typed honestly as `{ modelId?: string }` instead
// of accepting the loose props bag. The single unavoidable type erasure is the
// dynamic spread in the renderer below, where the runtime `name` and the
// loosely-typed `props` meet; it's localized there rather than scattered as
// per-entry `as ComponentType<unknown>` casts.
const MODAL_COMPONENTS = {
  NEW_DIAGRAM: NewDiagramModal,
  SHARE: ShareModal,
  SHARE_DASHBOARD: ShareDashboardModal,
  COLLABORATE_NAME: CollaborateNameModal,
  EXPORT_PPTX: PPTXExportModal,
  HowToUseModal,
  AboutModal,
  DELETE_VERSION: DeleteVersionModal,
  CONFIRM_RESTORE: ConfirmRestoreModal,
} satisfies Record<ModalName, React.ComponentType<never>>

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
  // Dynamic dispatch: `name` is a runtime value and `props` is the loosely
  // typed context bag, so this is the one place the per-modal prop types can't
  // be statically tied together. The registry above keeps each entry honestly
  // typed; the erasure is localized to this single cast.
  const SpecificModal = MODAL_COMPONENTS[
    name
  ] as unknown as React.ComponentType<ModalProps & { onClose?: () => void }>
  const { closeModal } = useModalContext()
  const isContentOverflow = Boolean(
    props && typeof props === "object" && props.contentOverflow
  )
  const isHomeDialog = isContentOverflow || isHomeDialogVariant(props)
  const isConfirmModal =
    name === "DELETE_VERSION" ||
    name === "CONFIRM_RESTORE" ||
    name === "COLLABORATE_NAME"
  const variant: ModalVariant =
    name === "SHARE"
      ? "editor-share"
      : isHomeDialog
        ? name === "NEW_DIAGRAM"
          ? "home-wide"
          : "home-compact"
        : isConfirmModal
          ? "confirm"
          : "plain"

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
      <ModalFrame
        title={MODAL_TITLES[name]}
        variant={variant}
        contentOverflow={isContentOverflow}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
        beforeBody={<ModalProgressBar />}
      >
        {/* The presentational modal bodies report dismissal through an
            `onClose` callback instead of reaching into the modal context. We
            wire it to `closeModal` *after* spreading the caller props so a
            caller-supplied `onClose` never shadows the body's close action. */}
        <SpecificModal {...props} onClose={closeModal} />
      </ModalFrame>
    </ModalProgressProvider>
  )
}
