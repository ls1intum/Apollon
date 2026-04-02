import React from "react"
import {
  NewDiagramModal,
  NewDiagramFromTemplateModal,
  LoadDiagramModal,
  ShareModal,
  AboutModal,
  HowToUseModal,
} from "@/components/modals"
import { useModalContext } from "@/contexts"
import { ModalName, ModalProps } from "@/types"
import { Modal, Paper, Box, Button, Divider } from "@mui/material"
import { Typography } from "@/components/Typography"
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined"
import { log } from "@/logger"

interface ModalWrapperProps {
  name: ModalName
  props?: ModalProps
  closeModal: () => void
}

// Define a mapping from modal names to modal components
const MODAL_COMPONENTS: Record<ModalName, React.ComponentType<unknown>> = {
  NEW_DIAGRAM: NewDiagramModal,
  NEW_DIAGRAM_FROM_TEMPLATE: NewDiagramFromTemplateModal,
  SHARE: ShareModal,
  LOAD_DIAGRAM: LoadDiagramModal,
  HowToUseModal: HowToUseModal,
  AboutModal: AboutModal,
  // Add other modals here
}

const MODAL_TITLES: Record<ModalName, string> = {
  NEW_DIAGRAM: "Create new Diagram",
  NEW_DIAGRAM_FROM_TEMPLATE: "Create new Diagram from Template",
  SHARE: "Share",
  LOAD_DIAGRAM: "Load Diagram",
  HowToUseModal: "How to use this editor?",
  AboutModal: "Information about Apollon",
  // Add other modals here
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  flexDirection: "column",
  minWidth: "20vw", // or use a specific pixel value like "600px"
  maxWidth: "90vw", // to limit on very large screens
  width: "50vw", // ensures it's at least half screen
  gap: 1,
  bgcolor: "var(--apollon-background)",
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ name, props }) => {
  const SpecificModal = MODAL_COMPONENTS[name]
  const { closeModal } = useModalContext()

  if (!SpecificModal) {
    log.error(`No modal found for name: ${name}`)
    return null
  }

  return (
    <Modal
      open
      onClose={closeModal}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Paper sx={style}>
        {/* Header */}
        <Box
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
          }}
        >
          <Typography variant="h5" id="modal-modal-title">
            {MODAL_TITLES[name]}
          </Typography>

          <Button
            sx={{ position: "absolute", top: 16, right: 8 }}
            onClick={closeModal}
          >
            <CloseOutlinedIcon sx={{ color: "grey" }} />
          </Button>
        </Box>
        <Divider sx={{ bgcolor: "var(--apollon-background-variant)" }} />

        {/* Scrollable Content */}
        <Box
          sx={{
            p: 2,
            overflowY: "auto", // Enable vertical scrolling
            maxHeight: "calc(90vh - 60px)", // Adjust for header and padding
            flexGrow: 1, // Allow content to take remaining space
          }}
        >
          {SpecificModal && <SpecificModal {...props} />}
        </Box>
      </Paper>
    </Modal>
  )
}
