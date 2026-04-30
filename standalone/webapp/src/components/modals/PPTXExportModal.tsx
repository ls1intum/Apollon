import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Link,
} from "@mui/material"
import { useEditorContext, useModalContext } from "@/contexts"
import { useExportAsPPTX } from "@/hooks"
import {
  BackgroundOption,
  DEFAULT_PPTX_PERSISTED_SETTINGS,
  DiagramFitOption,
  FontFaceOption,
  loadPptxSettings,
  savePptxSettings,
  SlideSizeOption,
} from "@/lib/pptxExportSettings"
import { Typography } from "@/components/Typography"

const FONT_OPTIONS: Array<{ value: FontFaceOption; label: string }> = [
  { value: "auto", label: "Auto (matches your platform)" },
  { value: "Inter", label: "Inter" },
  { value: "SF Pro Text", label: "SF Pro Text (macOS)" },
  { value: "Calibri", label: "Calibri (Windows default)" },
  { value: "Aptos", label: "Aptos (Microsoft 365 default)" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
]

/**
 * MUI controls don't read Apollon's CSS theme variables on their own — there
 * is no MUI ThemeProvider in this app. Each component has to bridge the gap
 * via `sx`. These constants centralize the colors so the dialog renders
 * correctly in both light and dark mode using the same `--apollon-*` tokens
 * as the rest of the editor.
 */
const TEXT_PRIMARY = "var(--apollon-primary-contrast)"
const TEXT_SECONDARY = "var(--apollon-secondary)"
const INPUT_BORDER = "var(--apollon-switch-box-border-color)"
const INPUT_BORDER_HOVER = "var(--apollon-primary-contrast)"
const ACCENT = "var(--apollon-primary)"

const inputSx = {
  // Text inside the field itself
  "& .MuiInputBase-input": { color: TEXT_PRIMARY },
  "& .MuiInputBase-root": { color: TEXT_PRIMARY },
  // Outlined-variant border + label
  "& .MuiOutlinedInput-notchedOutline": { borderColor: INPUT_BORDER },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: INPUT_BORDER_HOVER },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
  "& .MuiInputLabel-root": { color: TEXT_SECONDARY },
  "& .MuiInputLabel-root.Mui-focused": { color: ACCENT },
  // Caret in select dropdowns
  "& .MuiSelect-icon": { color: TEXT_SECONDARY },
} as const

const radioSx = {
  color: TEXT_SECONDARY,
  "&.Mui-checked": { color: ACCENT },
} as const

const labelSx = {
  fontWeight: 500,
  display: "block",
  mb: 0.5,
  color: TEXT_PRIMARY,
} as const

const helperSx = {
  color: TEXT_SECONDARY,
  display: "block",
  mt: 0.5,
} as const

const stripPptxExtension = (name: string) =>
  name.endsWith(".pptx") ? name.slice(0, -".pptx".length) : name

export const PPTXExportModal = () => {
  const { editor } = useEditorContext()
  const { closeModal } = useModalContext()
  const exportPptx = useExportAsPPTX()

  const persisted = useMemo(() => loadPptxSettings(), [])
  const defaultFileName = stripPptxExtension(
    editor?.model.title || "diagram"
  )

  const [fileName, setFileName] = useState(defaultFileName)
  const [slideSize, setSlideSize] = useState<SlideSizeOption>(persisted.slideSize)
  const [diagramFit, setDiagramFit] = useState<DiagramFitOption>(
    persisted.diagramFit
  )
  const [fontFace, setFontFace] = useState<FontFaceOption>(persisted.fontFace)
  const [background, setBackground] = useState<BackgroundOption>(
    persisted.background
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
    } finally {
      setSubmitting(false)
    }
  }

  const radioOptionLabel = (
    title: string,
    description?: string
  ) => (
    <Box>
      <Typography sx={{ color: TEXT_PRIMARY }}>{title}</Typography>
      {description && (
        <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
          {description}
        </Typography>
      )}
    </Box>
  )

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ color: TEXT_PRIMARY }}
    >
      <Stack spacing={3}>
        <TextField
          inputRef={fileNameRef}
          label="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          fullWidth
          required
          sx={inputSx}
          slotProps={{
            input: {
              endAdornment: (
                <Typography sx={{ color: TEXT_SECONDARY, pr: 1 }}>
                  .pptx
                </Typography>
              ),
            },
          }}
        />

        <FormControl>
          <Typography variant="body2" sx={labelSx}>
            Slide size
          </Typography>
          <RadioGroup
            value={slideSize}
            onChange={(e) => setSlideSize(e.target.value as SlideSizeOption)}
          >
            <FormControlLabel
              value="fit"
              sx={{ color: TEXT_PRIMARY }}
              control={<Radio sx={radioSx} />}
              label={radioOptionLabel(
                "Fit to content",
                "Slide canvas matches the diagram bounds. Best for standalone files."
              )}
            />
            <FormControlLabel
              value="widescreen"
              sx={{ color: TEXT_PRIMARY }}
              control={<Radio sx={radioSx} />}
              label={radioOptionLabel(
                "Widescreen 16:9 (13.33″ × 7.5″)",
                "Diagram centred and scaled to fit. Drops cleanly into modern decks."
              )}
            />
            <FormControlLabel
              value="standard"
              sx={{ color: TEXT_PRIMARY }}
              control={<Radio sx={radioSx} />}
              label={radioOptionLabel(
                "Standard 4:3 (10″ × 7.5″)",
                "Older deck format."
              )}
            />
          </RadioGroup>
        </FormControl>

        {slideSize !== "fit" && (
          <FormControl>
            <Typography variant="body2" sx={labelSx}>
              Diagram size on slide
            </Typography>
            <RadioGroup
              row
              value={diagramFit}
              onChange={(e) =>
                setDiagramFit(e.target.value as DiagramFitOption)
              }
            >
              <FormControlLabel
                value="shrink"
                sx={{ color: TEXT_PRIMARY }}
                control={<Radio sx={radioSx} />}
                label="Shrink to fit"
              />
              <FormControlLabel
                value="fill"
                sx={{ color: TEXT_PRIMARY }}
                control={<Radio sx={radioSx} />}
                label="Fill slide"
              />
              <FormControlLabel
                value="actual"
                sx={{ color: TEXT_PRIMARY }}
                control={<Radio sx={radioSx} />}
                label="Actual size"
              />
            </RadioGroup>
            <Typography variant="caption" sx={helperSx}>
              {diagramFit === "shrink" &&
                "Keeps the source size when it fits; only shrinks larger diagrams."}
              {diagramFit === "fill" &&
                "Scales the diagram up or down to fill the slide canvas (preserves aspect ratio)."}
              {diagramFit === "actual" &&
                "Centres the diagram at its source size; may overflow the slide."}
            </Typography>
          </FormControl>
        )}

        <FormControl fullWidth>
          <Typography variant="body2" sx={labelSx}>
            Font
          </Typography>
          <Select
            value={fontFace}
            onChange={(e) => setFontFace(e.target.value as FontFaceOption)}
            size="small"
            sx={inputSx}
          >
            {FONT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="caption" sx={helperSx}>
            PowerPoint stores a single font name without fallbacks; pick one
            installed wherever the file will be opened.
          </Typography>
        </FormControl>

        <FormControl>
          <Typography variant="body2" sx={labelSx}>
            Background
          </Typography>
          <RadioGroup
            row
            value={background}
            onChange={(e) =>
              setBackground(e.target.value as BackgroundOption)
            }
          >
            <FormControlLabel
              value="white"
              sx={{ color: TEXT_PRIMARY }}
              control={<Radio sx={radioSx} />}
              label="White"
            />
            <FormControlLabel
              value="transparent"
              sx={{ color: TEXT_PRIMARY }}
              control={<Radio sx={radioSx} />}
              label="Transparent"
            />
          </RadioGroup>
        </FormControl>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pt: 1 }}
        >
          <Link
            component="button"
            type="button"
            onClick={resetToDefaults}
            sx={{
              fontSize: "0.85rem",
              color: ACCENT,
              textDecorationColor: ACCENT,
            }}
          >
            Reset to defaults
          </Link>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={closeModal}
              disabled={submitting}
              sx={{
                color: TEXT_PRIMARY,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "var(--apollon-background-variant)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={!canSubmit}
              sx={{
                textTransform: "none",
                bgcolor: ACCENT,
                "&:hover": { bgcolor: ACCENT, filter: "brightness(0.92)" },
              }}
            >
              {submitting ? "Exporting…" : "Export"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )
}
