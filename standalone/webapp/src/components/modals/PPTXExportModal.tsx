import { FormEvent, useEffect, useId, useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@tumaet/ui/components/button"
import { DialogFooter } from "@tumaet/ui/components/dialog"
import { Input } from "@tumaet/ui/components/input"
import { RadioGroup, RadioGroupItem } from "@tumaet/ui/components/radio-group"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@tumaet/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumaet/ui/components/select"
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

const stripPptxExtension = (name: string) => name.replace(/\.pptx$/i, "")

const FIT_HELPER_TEXT: Record<DiagramFitOption, string> = {
  shrink: "Keeps the source size when it fits; only shrinks larger diagrams.",
  fill: "Scales the diagram up or down to fill the slide while preserving its proportions.",
  actual: "Centers the diagram at its source size; it may overflow the slide.",
}

const RADIO_LABEL_CLASS =
  "flex cursor-pointer items-start gap-2 py-0.5 text-foreground"

type SlideRadioProps = {
  value: SlideSizeOption | DiagramFitOption
  title: string
  description?: string
}

const FieldRadio = ({ value, title, description }: SlideRadioProps) => {
  // role="radio" buttons take their accessible name from aria-labelledby, not a
  // wrapping <label> (that only works for native form controls). Point the radio
  // at the visible title text so screen readers + the PPTX test announce it.
  const titleId = useId()
  return (
    <label className={RADIO_LABEL_CLASS}>
      <RadioGroupItem
        value={value}
        aria-labelledby={titleId}
        className="mt-0.5"
      />
      <span className="flex flex-col gap-0">
        <span id={titleId} className="leading-snug">
          {title}
        </span>
        {description && (
          <span className="text-xs leading-tight text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

export const PPTXExportModal = () => {
  const { editor } = useEditorContext()
  const { closeModal } = useModalContext()
  const exportPptx = useExportAsPPTX()

  // Stable ids for label↔control association so screen readers announce each
  // field by its label.
  const idFileName = useId()
  const idSlideSize = useId()
  const idScale = useId()
  const idScaleHelp = useId()
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

  // Autofocus + select the file name on open. We resolve the input by id rather
  // than a forwarded ref because the shared @tumaet/ui Input is a plain function
  // component and does not forward refs to the underlying <input>.
  useEffect(() => {
    const el = document.getElementById(idFileName) as HTMLInputElement | null
    el?.focus()
    el?.select()
  }, [idFileName])

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Create an editable PowerPoint (.pptx) file for PowerPoint, Keynote, and
        other compatible presentation apps.
      </p>

      <Field className="gap-1">
        <FieldLabel htmlFor={idFileName} className="text-sm text-foreground">
          File name
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id={idFileName}
            required
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">.pptx</span>
        </div>
      </Field>

      <Field className="gap-2">
        <span id={idSlideSize} className="text-sm font-medium text-foreground">
          Slide size
        </span>
        <RadioGroup
          aria-labelledby={idSlideSize}
          value={slideSize}
          onValueChange={(value) => setSlideSize(value as SlideSizeOption)}
        >
          <FieldRadio
            value="fit"
            title="Fit to content"
            description="Use the diagram bounds as the slide size."
          />
          <FieldRadio
            value="widescreen"
            title="Widescreen 16:9 (13.33″ × 7.5″)"
            description="Use the standard format for most modern presentations."
          />
          <FieldRadio
            value="standard"
            title="Standard 4:3 (10″ × 7.5″)"
            description="Use this for older 4:3 presentations."
          />
        </RadioGroup>
      </Field>

      <Field className="gap-1">
        <FieldLabel htmlFor={idScale} className="text-sm text-foreground">
          Scale
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id={idScale}
            value={scalePercent}
            onChange={(e) => setScalePercent(e.target.value)}
            type="number"
            required
            min={MIN_PPTX_SCALE_PERCENT}
            max={MAX_PPTX_SCALE_PERCENT}
            step={5}
            aria-invalid={!isScaleValid}
            aria-describedby={idScaleHelp}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        {isScaleValid ? (
          <FieldDescription id={idScaleHelp} className="text-xs">
            100% keeps the current diagram size. Increase it to make the diagram
            larger.
          </FieldDescription>
        ) : (
          <FieldError id={idScaleHelp} className="text-xs">
            {`Enter a value from ${MIN_PPTX_SCALE_PERCENT}% to ${MAX_PPTX_SCALE_PERCENT}%.`}
          </FieldError>
        )}
        {slideSize !== "fit" && diagramFit === "fill" && (
          <FieldDescription className="text-xs">
            Fill slide always uses the selected slide size, so scale does not
            change the final size on the slide.
          </FieldDescription>
        )}
      </Field>

      {slideSize !== "fit" && (
        <Field className="gap-1">
          <span
            id={idDiagramFit}
            className="text-sm font-medium text-foreground"
          >
            Diagram size on slide
          </span>
          <RadioGroup
            aria-labelledby={idDiagramFit}
            value={diagramFit}
            onValueChange={(value) => setDiagramFit(value as DiagramFitOption)}
            className="grid-flow-col justify-start gap-4"
          >
            <FieldRadio value="shrink" title="Shrink to fit" />
            <FieldRadio value="fill" title="Fill slide" />
            <FieldRadio value="actual" title="Actual size" />
          </RadioGroup>
          <FieldDescription className="text-xs">
            {FIT_HELPER_TEXT[diagramFit]}
          </FieldDescription>
        </Field>
      )}

      <Field className="gap-1">
        <span id={idFont} className="text-sm font-medium text-foreground">
          Font
        </span>
        <Select
          value={fontFace}
          onValueChange={(value) => setFontFace(value as FontFaceOption)}
        >
          <SelectTrigger aria-labelledby={idFont} aria-label="Font">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription className="text-xs">
          The exported file stores one font name. Choose a font that is
          installed where the file will be opened.
        </FieldDescription>
      </Field>

      <DialogFooter className="sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="link"
          onClick={resetToDefaults}
          className="h-auto px-0 text-sm text-primary hover:underline"
        >
          Reset to defaults
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={!canSubmit}>
            {submitting ? "Exporting…" : "Export"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
