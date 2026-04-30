import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
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
 * Strip a trailing ".pptx" so the input shows just the base name. The
 * extension is always re-appended on export.
 */
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
    setFontFace(DEFAULT_PPTX_PERSISTED_SETTINGS.fontFace)
    setBackground(DEFAULT_PPTX_PERSISTED_SETTINGS.background)
    setFileName(defaultFileName)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      savePptxSettings({ slideSize, fontFace, background })
      await exportPptx({
        fileName: trimmedFileName,
        slideSize,
        fontFace,
        background,
      })
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <TextField
          inputRef={fileNameRef}
          label="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          fullWidth
          required
          slotProps={{
            input: {
              endAdornment: (
                <Typography sx={{ color: "text.secondary", pr: 1 }}>
                  .pptx
                </Typography>
              ),
            },
          }}
        />

        <FormControl>
          <FormLabel>Slide size</FormLabel>
          <RadioGroup
            value={slideSize}
            onChange={(e) => setSlideSize(e.target.value as SlideSizeOption)}
          >
            <FormControlLabel
              value="fit"
              control={<Radio />}
              label={
                <Box>
                  <Typography>Fit to content</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    Slide canvas matches the diagram bounds. Best for
                    standalone files.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="widescreen"
              control={<Radio />}
              label={
                <Box>
                  <Typography>Widescreen 16:9 (13.33″ × 7.5″)</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    Diagram centred and scaled to fit. Drops cleanly into
                    modern decks.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="standard"
              control={<Radio />}
              label={
                <Box>
                  <Typography>Standard 4:3 (10″ × 7.5″)</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    Older deck format.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1 }}>Font</FormLabel>
          <Select
            value={fontFace}
            onChange={(e) => setFontFace(e.target.value as FontFaceOption)}
            size="small"
          >
            {FONT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", mt: 0.5 }}
          >
            PowerPoint stores a single font name without fallbacks; pick one
            installed wherever the file will be opened.
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Background</FormLabel>
          <RadioGroup
            row
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
            sx={{ fontSize: "0.85rem" }}
          >
            Reset to defaults
          </Link>
          <Stack direction="row" spacing={1}>
            <Button onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={!canSubmit}
            >
              {submitting ? "Exporting…" : "Export"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )
}
