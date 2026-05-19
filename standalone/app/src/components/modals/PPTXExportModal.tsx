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
  DEFAULT_PPTX_PERSISTED_SETTINGS,
  DiagramFitOption,
  FontFaceOption,
  loadPptxSettings,
  MAX_PPTX_SCALE_PERCENT,
  MIN_PPTX_SCALE_PERCENT,
  normalizePptxScalePercent,
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

const TEXT_PRIMARY = "var(--apollon-primary-contrast)"
const TEXT_SECONDARY = "var(--apollon-secondary)"
const INPUT_BORDER = "var(--apollon-switch-box-border-color)"
const INPUT_BORDER_HOVER = "var(--apollon-primary-contrast)"
const ACCENT = "var(--apollon-primary)"

const stripPptxExtension = (name: string) => name.replace(/\.pptx$/i, "")

const FIT_HELPER_TEXT: Record<DiagramFitOption, string> = {
  shrink: "Keeps the source size when it fits; only shrinks larger diagrams.",
  fill: "Scales the diagram up or down to fill the slide while preserving its proportions.",
  actual: "Centers the diagram at its source size; it may overflow the slide.",
}

const inputSx = {
  "& .MuiInputBase-input": { color: TEXT_PRIMARY },
  "& .MuiInputBase-root, &.MuiInputBase-root": { color: TEXT_PRIMARY },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: INPUT_BORDER },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: INPUT_BORDER_HOVER,
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: ACCENT,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: ACCENT,
  },
  "& .MuiInputLabel-root": { color: TEXT_SECONDARY },
  "& .MuiInputLabel-root.Mui-focused": { color: ACCENT },
  "& .MuiSelect-icon": { color: TEXT_SECONDARY },
} as const

const radioSx = {
  color: TEXT_SECONDARY,
  "&.Mui-checked": { color: ACCENT },
} as const

const radioLabelSx = {
  alignItems: "flex-start",
  color: TEXT_PRIMARY,
  my: 0.25,
  "& .MuiRadio-root": { pt: 0.25 },
  "& .MuiFormControlLabel-label": { color: TEXT_PRIMARY },
} as const

const selectMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "var(--apollon-background)",
      color: TEXT_PRIMARY,
      "& .MuiMenuItem-root": { color: TEXT_PRIMARY },
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: "var(--apollon-background-variant)",
      },
      "& .MuiMenuItem-root.Mui-selected:hover, & .MuiMenuItem-root:hover": {
        bgcolor: "var(--apollon-background-variant)",
      },
    },
  },
} as const

const helperSx = {
  color: TEXT_SECONDARY,
  display: "block",
  mt: 0.5,
} as const

export const PPTXExportModal = () => {
  const { editor } = useEditorContext()
  const { closeModal } = useModalContext()
  const exportPptx = useExportAsPPTX()

  // Generate stable ids for label↔control association so screen readers
  // announce each field by its label. `useId` is stable across renders.
  const idFileName = useId()
  const idSlideSize = useId()
  const idScale = useId()
  const idDiagramFit = useId()
  const idFont = useId()

  const defaultFileName = stripPptxExtension(editor?.model.title || "diagram")

  // Read persisted settings exactly once so first paint is consistent.
  const [initial] = useState(loadPptxSettings)
  const [fileName, setFileName] = useState(defaultFileName)
  const [slideSize, setSlideSize] = useState<SlideSizeOption>(initial.slideSize)
  const [scalePercent, setScalePercent] = useState(String(initial.scalePercent))
  const [diagramFit, setDiagramFit] = useState<DiagramFitOption>(
    initial.diagramFit
  )
  const [fontFace, setFontFace] = useState<FontFaceOption>(initial.fontFace)
  const [submitting, setSubmitting] = useState(false)
  const fileNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fileNameRef.current?.focus()
    fileNameRef.current?.select()
  }, [])

  const trimmedFileName = fileName.trim()
  const parsedScalePercent = Number.parseFloat(scalePercent)
  const isScaleValid =
    Number.isFinite(parsedScalePercent) &&
    parsedScalePercent >= MIN_PPTX_SCALE_PERCENT &&
    parsedScalePercent <= MAX_PPTX_SCALE_PERCENT
  const canSubmit = trimmedFileName.length > 0 && isScaleValid && !submitting

  const resetToDefaults = () => {
    setSlideSize(DEFAULT_PPTX_PERSISTED_SETTINGS.slideSize)
    setScalePercent(String(DEFAULT_PPTX_PERSISTED_SETTINGS.scalePercent))
    setDiagramFit(DEFAULT_PPTX_PERSISTED_SETTINGS.diagramFit)
    setFontFace(DEFAULT_PPTX_PERSISTED_SETTINGS.fontFace)
    setFileName(defaultFileName)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const normalizedScalePercent =
        normalizePptxScalePercent(parsedScalePercent)
      savePptxSettings({
        slideSize,
        scalePercent: normalizedScalePercent,
        diagramFit,
        fontFace,
      })
      await exportPptx({
        fileName: trimmedFileName,
        slideSize,
        scalePercent: normalizedScalePercent,
        diagramFit,
        fontFace,
      })
      closeModal()
    } catch (err) {
      log.error("PPTX export failed", err as Error)
      toast.error("PPTX export failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const radioOptionLabel = (title: string, description?: string) => (
    <div className="flex flex-col gap-0">
      <Typography sx={{ color: TEXT_PRIMARY, lineHeight: 1.35 }}>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="caption"
          sx={{ color: TEXT_SECONDARY, display: "block", lineHeight: 1.25 }}
        >
          {description}
        </Typography>
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
        Create an editable PowerPoint (.pptx) file for PowerPoint, Keynote, and
        other compatible presentation apps.
      </Typography>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={idFileName}
          className="form-label text-sm"
          style={{ color: TEXT_PRIMARY }}
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
          sx={inputSx}
          slotProps={{
            input: {
              endAdornment: (
                <Typography sx={{ pr: 1, color: TEXT_SECONDARY }}>
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
            sx={radioLabelSx}
            control={<Radio sx={radioSx} />}
            label={radioOptionLabel(
              "Fit to content",
              "Use the diagram bounds as the slide size."
            )}
          />
          <FormControlLabel
            value="widescreen"
            sx={radioLabelSx}
            control={<Radio sx={radioSx} />}
            label={radioOptionLabel(
              "Widescreen 16:9 (13.33″ × 7.5″)",
              "Use the standard format for most modern presentations."
            )}
          />
          <FormControlLabel
            value="standard"
            sx={radioLabelSx}
            control={<Radio sx={radioSx} />}
            label={radioOptionLabel(
              "Standard 4:3 (10″ × 7.5″)",
              "Use this for older 4:3 presentations."
            )}
          />
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={idScale}
          className="form-label text-sm"
          style={{ color: TEXT_PRIMARY }}
        >
          Scale
        </label>
        <TextField
          id={idScale}
          value={scalePercent}
          onChange={(e) => setScalePercent(e.target.value)}
          type="number"
          size="small"
          required
          error={!isScaleValid}
          helperText={
            isScaleValid
              ? "100% keeps the current diagram size. Increase it to make the diagram larger."
              : `Enter a value from ${MIN_PPTX_SCALE_PERCENT}% to ${MAX_PPTX_SCALE_PERCENT}%.`
          }
          sx={{
            ...inputSx,
            "& .MuiFormHelperText-root": {
              color: isScaleValid
                ? TEXT_SECONDARY
                : "var(--apollon-alert-danger-color)",
            },
          }}
          slotProps={{
            htmlInput: {
              min: MIN_PPTX_SCALE_PERCENT,
              max: MAX_PPTX_SCALE_PERCENT,
              step: 5,
            },
            input: {
              endAdornment: (
                <Typography sx={{ color: TEXT_SECONDARY, pr: 1 }}>%</Typography>
              ),
            },
          }}
        />
        {slideSize !== "fit" && diagramFit === "fill" && (
          <Typography variant="caption" sx={helperSx}>
            Fill slide always uses the selected slide size, so scale does not
            change the final size on the slide.
          </Typography>
        )}
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
            onChange={(e) => setDiagramFit(e.target.value as DiagramFitOption)}
          >
            <FormControlLabel
              value="shrink"
              sx={radioLabelSx}
              control={<Radio sx={radioSx} />}
              label="Shrink to fit"
            />
            <FormControlLabel
              value="fill"
              sx={radioLabelSx}
              control={<Radio sx={radioSx} />}
              label="Fill slide"
            />
            <FormControlLabel
              value="actual"
              sx={radioLabelSx}
              control={<Radio sx={radioSx} />}
              label="Actual size"
            />
          </RadioGroup>
          <Typography variant="caption" sx={helperSx}>
            {FIT_HELPER_TEXT[diagramFit]}
          </Typography>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span
          id={idFont}
          className="form-label text-sm"
          style={{ color: TEXT_PRIMARY }}
        >
          Font
        </span>
        <Select
          value={fontFace}
          onChange={(e) => setFontFace(e.target.value as FontFaceOption)}
          size="small"
          inputProps={{ "aria-labelledby": idFont, "aria-label": "Font" }}
          sx={inputSx}
          MenuProps={selectMenuProps}
        >
          {FONT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" sx={helperSx}>
          The exported file stores one font name. Choose a font that is
          installed where the file will be opened.
        </Typography>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-sm hover:underline"
          style={{ color: ACCENT }}
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
