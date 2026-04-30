import { FormEvent, useEffect, useId, useRef, useState } from "react"
import {
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from "@mui/material"
import { toast } from "react-toastify"
import { Typography } from "@/components/Typography"
import { useEditorContext, useModalContext } from "@/contexts"
import { useExportAsPPTX } from "@/hooks"
import { log } from "@/logger"
import {
  BackgroundOption,
  DEFAULT_PPTX_PERSISTED_SETTINGS,
  DiagramFitOption,
  FontFaceOption,
  loadPptxSettings,
  savePptxSettings,
  SlideSizeOption,
} from "@/lib/pptxExportSettings"

const FONT_OPTIONS: ReadonlyArray<{
  value: FontFaceOption
  label: string
}> = [
  { value: "auto", label: "Auto (matches your platform)" },
  { value: "Inter", label: "Inter" },
  { value: "SF Pro Text", label: "SF Pro Text (macOS)" },
  { value: "Calibri", label: "Calibri (Windows default)" },
  { value: "Aptos", label: "Aptos (Microsoft 365 default)" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
]

const stripPptxExtension = (name: string) => name.replace(/\.pptx$/i, "")

const FIT_HELPER_TEXT: Record<DiagramFitOption, string> = {
  shrink:
    "Keeps the source size when it fits; only shrinks larger diagrams.",
  fill: "Scales the diagram up or down to fill the slide canvas (preserves aspect ratio).",
  actual:
    "Centres the diagram at its source size; may overflow the slide.",
}

const inputColorSx = { input: { color: "var(--apollon-primary-contrast)" } }

export const PPTXExportModal = () => {
  const { editor } = useEditorContext()
  const { closeModal } = useModalContext()
  const exportPptx = useExportAsPPTX()

  // Generate stable ids for label↔control association so screen readers
  // announce each field by its label. `useId` is stable across renders.
  const idFileName = useId()
  const idSlideSize = useId()
  const idDiagramFit = useId()
  const idFont = useId()
  const idBackground = useId()

  const defaultFileName = stripPptxExtension(
    editor?.model.title || "diagram"
  )

  // Read persisted settings exactly once so first paint is consistent.
  const [initial] = useState(loadPptxSettings)
  const [fileName, setFileName] = useState(defaultFileName)
  const [slideSize, setSlideSize] = useState<SlideSizeOption>(initial.slideSize)
  const [diagramFit, setDiagramFit] = useState<DiagramFitOption>(
    initial.diagramFit
  )
  const [fontFace, setFontFace] = useState<FontFaceOption>(initial.fontFace)
  const [background, setBackground] = useState<BackgroundOption>(
    initial.background
  )
  const [submitting, setSubmitting] = useState(false)
  const fileNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fileNameRef.current?.focus()
    fileNameRef.current?.select()
  }, [])

  const trimmedFileName = fileName.trim()
  const canSubmit = trimmedFileName.length > 0 && !submitting

  const resetToDefaults = () => {
    setSlideSize(DEFAULT_PPTX_PERSISTED_SETTINGS.slideSize)
    setDiagramFit(DEFAULT_PPTX_PERSISTED_SETTINGS.diagramFit)
    setFontFace(DEFAULT_PPTX_PERSISTED_SETTINGS.fontFace)
    setBackground(DEFAULT_PPTX_PERSISTED_SETTINGS.background)
    setFileName(defaultFileName)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      savePptxSettings({ slideSize, diagramFit, fontFace, background })
      await exportPptx({
        fileName: trimmedFileName,
        slideSize,
        diagramFit,
        fontFace,
        background,
      })
      closeModal()
    } catch (err) {
      log.error("PPTX export failed", err as Error)
      toast.error("PPTX export failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={idFileName}
          className="form-label text-sm"
          style={{ color: "var(--apollon-primary-contrast)" }}
        >
          File name
        </label>
        <TextField
          id={idFileName}
          inputRef={fileNameRef}
          fullWidth
          required
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          variant="outlined"
          sx={inputColorSx}
          slotProps={{
            input: {
              endAdornment: (
                <Typography
                  className="text-gray-500"
                  sx={{ pr: 1, color: "inherit" }}
                >
                  .pptx
                </Typography>
              ),
            },
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Typography
          id={idSlideSize}
          variant="body2"
          component="span"
          className="form-label"
        >
          Slide size
        </Typography>
        <RadioGroup
          aria-labelledby={idSlideSize}
          value={slideSize}
          onChange={(e) => setSlideSize(e.target.value as SlideSizeOption)}
        >
          <FormControlLabel
            value="fit"
            control={<Radio />}
            label={
              <div className="flex flex-col">
                <Typography>Fit to content</Typography>
                <Typography variant="caption" className="text-gray-500">
                  Slide canvas matches the diagram bounds. Best for
                  standalone files.
                </Typography>
              </div>
            }
          />
          <FormControlLabel
            value="widescreen"
            control={<Radio />}
            label={
              <div className="flex flex-col">
                <Typography>Widescreen 16:9 (13.33″ × 7.5″)</Typography>
                <Typography variant="caption" className="text-gray-500">
                  Diagram centred on a 16:9 canvas. Drops cleanly into
                  modern decks.
                </Typography>
              </div>
            }
          />
          <FormControlLabel
            value="standard"
            control={<Radio />}
            label={
              <div className="flex flex-col">
                <Typography>Standard 4:3 (10″ × 7.5″)</Typography>
                <Typography variant="caption" className="text-gray-500">
                  Older deck format.
                </Typography>
              </div>
            }
          />
        </RadioGroup>
      </div>

      {slideSize !== "fit" && (
        <div className="flex flex-col gap-1">
          <Typography
            id={idDiagramFit}
            variant="body2"
            component="span"
            className="form-label"
          >
            Diagram size on slide
          </Typography>
          <RadioGroup
            row
            aria-labelledby={idDiagramFit}
            value={diagramFit}
            onChange={(e) =>
              setDiagramFit(e.target.value as DiagramFitOption)
            }
          >
            <FormControlLabel
              value="shrink"
              control={<Radio />}
              label="Shrink to fit"
            />
            <FormControlLabel
              value="fill"
              control={<Radio />}
              label="Fill slide"
            />
            <FormControlLabel
              value="actual"
              control={<Radio />}
              label="Actual size"
            />
          </RadioGroup>
          <Typography variant="caption" className="text-gray-500">
            {FIT_HELPER_TEXT[diagramFit]}
          </Typography>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span
          id={idFont}
          className="form-label text-sm"
          style={{ color: "var(--apollon-primary-contrast)" }}
        >
          Font
        </span>
        <Select
          value={fontFace}
          onChange={(e) => setFontFace(e.target.value as FontFaceOption)}
          size="small"
          inputProps={{ "aria-labelledby": idFont, "aria-label": "Font" }}
          sx={{ color: "var(--apollon-primary-contrast)" }}
        >
          {FONT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" className="text-gray-500">
          PowerPoint stores a single font name without fallbacks; pick one
          installed wherever the file will be opened.
        </Typography>
      </div>

      <div className="flex flex-col gap-1">
        <Typography
          id={idBackground}
          variant="body2"
          component="span"
          className="form-label"
        >
          Background
        </Typography>
        <RadioGroup
          row
          aria-labelledby={idBackground}
          value={background}
          onChange={(e) =>
            setBackground(e.target.value as BackgroundOption)
          }
        >
          <FormControlLabel value="white" control={<Radio />} label="White" />
          <FormControlLabel
            value="transparent"
            control={<Radio />}
            label="Transparent"
          />
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-sm hover:underline"
          style={{ color: "var(--apollon-primary)" }}
        >
          Reset to defaults
        </button>
        <div className="flex gap-1">
          <Button
            variant="contained"
            onClick={closeModal}
            disabled={submitting}
            sx={{ bgcolor: "gray", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={!canSubmit}
            sx={{ textTransform: "none" }}
          >
            {submitting ? "Exporting…" : "Export"}
          </Button>
        </div>
      </div>
    </form>
  )
}
