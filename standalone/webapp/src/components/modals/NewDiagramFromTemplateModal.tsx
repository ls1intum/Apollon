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
import { useModalProgress } from "@/contexts/ModalProgressContext"
import {
  HomeDialogActions,
  HomeDialogContent,
  HomeDialogField,
  HomeDialogNotice,
  HomeDialogOptionGroup,
  HomeDialogTextInput,
  isHomeDialogVariant,
  type HomeDialogOption,
} from "./HomeDialog"

enum TemplateType {
  Adapter = "Adapter",
  Bridge = "Bridge",
  Command = "Command",
  Observer = "Observer",
  Factory = "Factory",
}

const templateGroups: {
  label: string
  templates: HomeDialogOption<TemplateType>[]
}[] = [
  {
    label: "Structural",
    templates: [
      { value: TemplateType.Adapter, label: "Adapter" },
      { value: TemplateType.Bridge, label: "Bridge" },
    ],
  },
  {
    label: "Behavioral",
    templates: [
      { value: TemplateType.Command, label: "Command" },
      { value: TemplateType.Observer, label: "Observer" },
    ],
  },
  {
    label: "Creational",
    templates: [{ value: TemplateType.Factory, label: "Factory" }],
  },
]

export const NewDiagramFromTemplateModal = (props: unknown) => {
  const isHomeDialog = isHomeDialogVariant(props)
  const { closeModal } = useModalContext()
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(
    TemplateType.Adapter
  )
  const [diagramTitle, setDiagramTitle] = useState<string>(TemplateType.Adapter)
  const [isTitleDefault, setIsTitleDefault] = useState<boolean>(true)

  const handleTemplateChange = (template: TemplateType) => {
    setSelectedTemplate(template)
    if (isTitleDefault) {
      setDiagramTitle(template)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiagramTitle(e.target.value)
    setIsTitleDefault(false)
  }
  const createModel = usePersistenceModelStore((store) => store.createModel)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { setLoading } = useModalProgress()

  const handleCreate = async () => {
    if (isCreating) return

    setIsCreating(true)
    setLoading(true)
    setError(null)

    try {
      const jsonModule = await import(
        `assets/diagramTemplates/${selectedTemplate}.json`
      )
      const jsonData = jsonModule.default

      if (!jsonData) {
        throw new Error("Selected template data not found")
      }
      const nextId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const clonedModel =
        typeof structuredClone === "function"
          ? structuredClone(jsonData)
          : JSON.parse(JSON.stringify(jsonData))
      clonedModel.id = nextId
      clonedModel.title = diagramTitle.trim() || selectedTemplate

      createModel(clonedModel)
      setIsCreating(false)
      setLoading(false)
      closeModal()
      navigate(`/local/${nextId}`)
    } catch (err: unknown) {
      log.error("Error creating diagram from template:", err as Error)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred")
      }
      setIsCreating(false)
      setLoading(false)
    }
  }

  if (isHomeDialog) {
    return (
      <HomeDialogContent>
        <HomeDialogNotice>
          Start from a design-pattern template and open a local copy in the
          editor.
        </HomeDialogNotice>

        {error && (
          <div className="rounded-md border border-[var(--apollon-red,#d32f2f)] bg-[color-mix(in_srgb,var(--apollon-red,#d32f2f)_10%,transparent)] px-3 py-2 text-sm text-[var(--home-text-primary)]">
            {error}
          </div>
        )}

        <HomeDialogField label="Name" htmlFor="diagram-title">
          <HomeDialogTextInput
            id="diagram-title"
            type="text"
            value={diagramTitle}
            onChange={handleTitleChange}
            placeholder="Enter diagram title"
            maxLength={120}
            disabled={isCreating}
          />
        </HomeDialogField>

        <div className="flex flex-col gap-4">
          {templateGroups.map((group) => (
            <HomeDialogOptionGroup
              key={group.label}
              label={group.label}
              options={group.templates}
              value={selectedTemplate}
              onChange={handleTemplateChange}
              disabled={isCreating}
              onConfirm={handleCreate}
            />
          ))}
        </div>

        <HomeDialogActions
          confirmLabel="Create"
          loadingLabel="Creating..."
          loading={isCreating}
          confirmDisabled={!diagramTitle.trim()}
          onCancel={closeModal}
          onConfirm={handleCreate}
        />
      </HomeDialogContent>
    )
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
            disabled={isCreating}
            selected={selectedTemplate === TemplateType.Adapter}
            onClick={() => setSelectedTemplate(TemplateType.Adapter)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Adapter</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={isCreating}
            selected={selectedTemplate === TemplateType.Bridge}
            onClick={() => setSelectedTemplate(TemplateType.Bridge)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Bridge</ListItemText>
          </MenuItem>

          <Divider />
          <Typography variant="h6">Behavioral</Typography>
          <MenuItem
            disabled={isCreating}
            selected={selectedTemplate === TemplateType.Command}
            onClick={() => setSelectedTemplate(TemplateType.Command)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Command</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={isCreating}
            selected={selectedTemplate === TemplateType.Observer}
            onClick={() => setSelectedTemplate(TemplateType.Observer)}
            onDoubleClick={handleCreate}
          >
            <ListItemText inset>Observer</ListItemText>
          </MenuItem>

          <Divider />
          <Typography variant="h6">Creational</Typography>
          <MenuItem
            disabled={isCreating}
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
          disabled={isCreating}
          onClick={closeModal}
          sx={{ bgcolor: "gray", textTransform: "none" }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disabled={isCreating}
          onClick={handleCreate}
          sx={{
            textTransform: "none",
          }}
        >
          {isCreating ? "Creating..." : "Create Diagram"}
        </Button>
      </Box>
    </Box>
  )
}
