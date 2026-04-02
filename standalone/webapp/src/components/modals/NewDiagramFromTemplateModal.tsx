import Box from "@mui/material/Box"
import Button from "@mui/material/Button/Button"
import { useModalContext } from "@/contexts/ModalContext"
import { ListItemText } from "@/components/ListItemText"
import MenuItem from "@mui/material/MenuItem"
import MenuList from "@mui/material/MenuList"
import Divider from "@mui/material/Divider"
import { Typography } from "@/components/Typography"
import { useState } from "react"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useNavigate } from "react-router"
import { log } from "@/logger"

enum TemplateType {
  Adapter = "Adapter",
  Bridge = "Bridge",
  Command = "Command",
  Observer = "Observer",
  Factory = "Factory",
}

export const NewDiagramFromTemplateModal = () => {
  const { closeModal } = useModalContext()
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(
    TemplateType.Adapter
  )
  const createModel = usePersistenceModelStore((store) => store.createModel)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setError(null)

    try {
      const jsonModule = await import(
        `assets/diagramTemplates/${selectedTemplate}.json`
      )
      const jsonData = jsonModule.default

      if (!jsonData) {
        throw new Error("Selected template data not found")
      }
      const timeStapToCreate = new Date().getTime()

      createModel(jsonData)
      navigate("..", {
        relative: "route",
        state: { timeStapToCreate },
      })

      closeModal()
    } catch (err: unknown) {
      log.error("Error creating diagram from template:", err as Error)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred")
      }
    }
  }

  return (
    <Box>
      <Box sx={{ pt: 2, px: 2 }}>
        {error && (
          <Box sx={{ px: 1, color: "red", mb: 1 }}>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}

        {/* Selected Template */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Typography variant="body1">Selected Template</Typography>
          <Box
            sx={{
              p: 1,
              mt: 0.5,
              mb: 1,
              bgcolor: "var(--apollon-gray)",
              borderRadius: 1,
            }}
          >
            <Typography color="textPrimary">{selectedTemplate}</Typography>
          </Box>
        </Box>

        <MenuList dense>
          <Typography variant="h6">Structural</Typography>
          <MenuItem
            selected={selectedTemplate === TemplateType.Adapter}
            onClick={() => setSelectedTemplate(TemplateType.Adapter)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Adapter</ListItemText>
          </MenuItem>
          <MenuItem
            selected={selectedTemplate === TemplateType.Bridge}
            onClick={() => setSelectedTemplate(TemplateType.Bridge)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Bridge</ListItemText>
          </MenuItem>

          <Divider />
          <Typography variant="h6">Behavioral</Typography>
          <MenuItem
            selected={selectedTemplate === TemplateType.Command}
            onClick={() => setSelectedTemplate(TemplateType.Command)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Command</ListItemText>
          </MenuItem>
          <MenuItem
            selected={selectedTemplate === TemplateType.Observer}
            onClick={() => setSelectedTemplate(TemplateType.Observer)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Observer</ListItemText>
          </MenuItem>

          <Divider />
          <Typography variant="h6">Creational</Typography>
          <MenuItem
            selected={selectedTemplate === TemplateType.Factory}
            onClick={() => setSelectedTemplate(TemplateType.Factory)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Factory</ListItemText>
          </MenuItem>
        </MenuList>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          flex: 1,
          pb: 2,
          px: 2,
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={closeModal}
          sx={{ bgcolor: "gray", textTransform: "none" }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{
            textTransform: "none",
          }}
        >
          Create Diagram
        </Button>
      </Box>
    </Box>
  )
}
