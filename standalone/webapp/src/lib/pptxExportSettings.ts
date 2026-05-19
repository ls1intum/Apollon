/**
 * Settings surfaced by the PPTX export dialog. Each option is one PowerPoint
 * tweak the user can't trivially redo post-export and that has more than one
 * sensible default.
 *
 * Persisted to localStorage so the dialog re-opens with the user's last
 * choices. The filename is intentionally NOT persisted — it always defaults to
 * the active diagram's title at the moment the dialog opens.
 */

import { log } from "@/logger"

export type SlideSizeOption = "fit" | "widescreen" | "standard"

/**
 * How the diagram fills the slide canvas when the canvas isn't sized to the
 * diagram (i.e. SlideSizeOption !== "fit"):
 *
 *   - "shrink": only scale down if too large (default; preserves source size)
 *   - "fill":   scale up or down to fill the canvas, preserving aspect ratio
 *   - "actual": never scale; centre the diagram regardless of canvas size
 *
 * For SlideSizeOption "fit" the canvas matches the diagram exactly so this
 * value has no effect.
 */
export type DiagramFitOption = "shrink" | "fill" | "actual"

/**
 * "auto" picks the best font for the current platform at export time:
 * SF Pro Text on macOS/iOS (matches `system-ui` in the browser preview),
 * Inter elsewhere. Concrete names override the auto-detection.
 */
export type FontFaceOption =
  | "auto"
  | "Inter"
  | "SF Pro Text"
  | "Calibri"
  | "Arial"
  | "Helvetica"
  | "Aptos"

export type PptxPersistedSettings = {
  slideSize: SlideSizeOption
  scalePercent: number
  diagramFit: DiagramFitOption
  fontFace: FontFaceOption
}

export type PptxExportSettings = PptxPersistedSettings & {
  /** Filename without extension — `.pptx` is appended on export. */
  fileName: string
}

export const DEFAULT_PPTX_PERSISTED_SETTINGS: PptxPersistedSettings = {
  slideSize: "fit",
  scalePercent: 100,
  diagramFit: "shrink",
  fontFace: "auto",
}

const SLIDE_SIZE_VALUES: ReadonlyArray<SlideSizeOption> = [
  "fit",
  "widescreen",
  "standard",
]
const DIAGRAM_FIT_VALUES: ReadonlyArray<DiagramFitOption> = [
  "shrink",
  "fill",
  "actual",
]
const FONT_FACE_VALUES: ReadonlyArray<FontFaceOption> = [
  "auto",
  "Inter",
  "SF Pro Text",
  "Calibri",
  "Arial",
  "Helvetica",
  "Aptos",
]

const pickValid = <T extends string>(
  values: ReadonlyArray<T>,
  candidate: unknown,
  fallback: T
): T =>
  typeof candidate === "string" &&
  (values as ReadonlyArray<string>).includes(candidate)
    ? (candidate as T)
    : fallback

const STORAGE_KEY = "apollon.pptxExportSettings.v1"
export const MIN_PPTX_SCALE_PERCENT = 10
export const MAX_PPTX_SCALE_PERCENT = 400

export function normalizePptxScalePercent(scalePercent: unknown): number {
  const parsed =
    typeof scalePercent === "number"
      ? scalePercent
      : Number.parseFloat(String(scalePercent))

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PPTX_PERSISTED_SETTINGS.scalePercent
  }

  return Math.min(
    MAX_PPTX_SCALE_PERCENT,
    Math.max(MIN_PPTX_SCALE_PERCENT, parsed)
  )
}

export function loadPptxSettings(): PptxPersistedSettings {
  if (typeof localStorage === "undefined") {
    return DEFAULT_PPTX_PERSISTED_SETTINGS
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PPTX_PERSISTED_SETTINGS
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      slideSize: pickValid(
        SLIDE_SIZE_VALUES,
        parsed.slideSize,
        DEFAULT_PPTX_PERSISTED_SETTINGS.slideSize
      ),
      scalePercent: normalizePptxScalePercent(parsed.scalePercent),
      diagramFit: pickValid(
        DIAGRAM_FIT_VALUES,
        parsed.diagramFit,
        DEFAULT_PPTX_PERSISTED_SETTINGS.diagramFit
      ),
      fontFace: pickValid(
        FONT_FACE_VALUES,
        parsed.fontFace,
        DEFAULT_PPTX_PERSISTED_SETTINGS.fontFace
      ),
    }
  } catch (err) {
    // Corrupt JSON, SecurityError in private mode, etc. Defaults are safe.
    log.warn("Failed to load PPTX settings; using defaults", err)
    return DEFAULT_PPTX_PERSISTED_SETTINGS
  }
}

export function savePptxSettings(settings: PptxPersistedSettings): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Quota / privacy mode — don't block the export.
  }
}

/**
 * Slide-canvas dimensions in inches for fixed-size options. Numbers from the
 * PowerPoint defaults: 16:9 widescreen = 13.333″ × 7.5″, 4:3 standard = 10″ × 7.5″.
 */
export const SLIDE_DIMENSIONS_IN: Record<
  "widescreen" | "standard",
  { width: number; height: number }
> = {
  widescreen: { width: 13.333, height: 7.5 },
  standard: { width: 10, height: 7.5 },
}
