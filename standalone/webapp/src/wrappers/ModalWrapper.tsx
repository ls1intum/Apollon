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
import { Modal, Paper, Box, Divider, IconButton } from "@mui/material"
import { Typography } from "@/components/Typography"
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined"
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

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  flexDirection: "column",
  minWidth: "20vw",
  maxWidth: "90vw",
  width: "50vw",
  gap: 1,
  bgcolor: "var(--apollon-background)",
} as const

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
      <Modal
        open
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Paper
          sx={{
            ...style,
            width: isEditorShareDialog
              ? "min(560px, calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px))"
              : isHomeDialog
                ? getHomeDialogWidth(isWideHomeDialog ? "wide" : "compact")
                : style.width,
            minWidth: isEditorShareDialog
              ? 0
              : isHomeDialog
                ? "320px"
                : style.minWidth,
            maxWidth:
              "calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 24px)",
            borderRadius: isHomeDialog ? "15px" : undefined,
            overflow: isHomeDialog ? "visible" : undefined,
            maxHeight:
              isHomeDialog || isEditorShareDialog
                ? "calc(100dvh - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px) - 24px)"
                : undefined,
            bgcolor: isHomeDialog
              ? "var(--home-surface-base)"
              : "var(--apollon-background)",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-modal-title"
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              p: isHomeDialog ? "18px 20px" : 2,
              bgcolor: isHomeDialog ? "var(--home-accent-base)" : undefined,
              borderTopLeftRadius: isHomeDialog ? "15px" : undefined,
              borderTopRightRadius: isHomeDialog ? "15px" : undefined,
              "@media (max-width: 950px) and (max-height: 500px)": {
                p: isHomeDialog ? "10px 14px" : "8px 12px",
              },
            }}
          >
            <Typography
              variant="h5"
              id="modal-modal-title"
              noWrap={isHomeDialog}
              sx={{
                fontFamily: isHomeDialog ? "Poppins, sans-serif" : undefined,
                fontWeight: isHomeDialog ? 500 : undefined,
                // Scale the title down on narrow screens instead of wrapping it
                // to a second line. Stays on one line; ellipsis is the last resort.
                fontSize: isHomeDialog
                  ? "clamp(0.95rem, 4vw, 1.3rem)"
                  : undefined,
                color: isHomeDialog
                  ? "var(--home-accent-contrast)"
                  : "var(--apollon-primary-contrast)",
                ...(isHomeDialog ? { minWidth: 0, whiteSpace: "nowrap" } : {}),
              }}
            >
              {MODAL_TITLES[name]}
            </Typography>
            <IconButton
              size="small"
              aria-label="Close"
              sx={{
                color: isHomeDialog
                  ? "var(--home-accent-contrast)"
                  : "var(--apollon-primary-contrast)",
                borderRadius: isHomeDialog ? "6px" : "2px",
                flexShrink: 0,
                "&:hover": {
                  bgcolor: isHomeDialog
                    ? "var(--home-on-accent-bg-hover)"
                    : "var(--apollon-background-variant)",
                  color: isHomeDialog
                    ? "var(--home-on-accent-text)"
                    : "var(--apollon-primary-contrast)",
                },
              }}
              onClick={handleClose}
            >
              <CloseOutlinedIcon />
            </IconButton>
          </Box>
          {!isHomeDialog && (
            <Divider sx={{ bgcolor: "var(--apollon-background-variant)" }} />
          )}

          {/* Progress bar — sits between header and content, outside scroll */}
          <ModalProgressBar />

          {/* Scrollable Content */}
          <Box
            sx={{
              p: isHomeDialog ? "24px 16px 16px" : 2,
              overflowY: isContentOverflow ? "visible" : "auto",
              maxHeight: isContentOverflow
                ? "none"
                : isHomeDialog
                  ? "calc(92vh - 84px)"
                  : "calc(90vh - 60px)",
              flexGrow: 1,
              "@media (max-width: 950px) and (max-height: 500px)": {
                p: isHomeDialog ? "12px" : "10px 12px",
                maxHeight:
                  "calc(100dvh - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px) - 64px)",
              },
            }}
          >
            {SpecificModal && <SpecificModal {...props} />}
          </Box>
        </Paper>
      </Modal>
    </ModalProgressProvider>
  )
}
