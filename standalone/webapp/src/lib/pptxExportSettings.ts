/**
 * User-controllable settings for the PPTX export dialog.
 *
 * Design goal: as few fields as actually pull their weight. Anything that has
 * a sensible default for 95% of users, or that PowerPoint itself can change
 * post-export, lives outside this surface.
 *
 * Persisted to localStorage so the dialog remembers the user's last choices.
 * Filename is intentionally NOT persisted — it always defaults to the active
 * diagram's title at the moment the dialog opens.
 */

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

export type BackgroundOption = "white" | "transparent"

export type PptxPersistedSettings = {
  slideSize: SlideSizeOption
  diagramFit: DiagramFitOption
  fontFace: FontFaceOption
  background: BackgroundOption
}

export type PptxExportSettings = PptxPersistedSettings & {
  /** Filename without extension — `.pptx` is appended on export. */
  fileName: string
}

export const DEFAULT_PPTX_PERSISTED_SETTINGS: PptxPersistedSettings = {
  slideSize: "fit",
  diagramFit: "shrink",
  fontFace: "auto",
  background: "white",
}

const STORAGE_KEY = "apollon.pptxExportSettings.v1"

export function loadPptxSettings(): PptxPersistedSettings {
  if (typeof localStorage === "undefined") {
    return DEFAULT_PPTX_PERSISTED_SETTINGS
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PPTX_PERSISTED_SETTINGS
    const parsed = JSON.parse(raw) as Partial<PptxPersistedSettings>
    return { ...DEFAULT_PPTX_PERSISTED_SETTINGS, ...parsed }
  } catch {
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

/** Slide-canvas dimensions in inches for fixed-size options. */
export const SLIDE_DIMENSIONS_IN: Record<
  Exclude<SlideSizeOption, "fit">,
  { width: number; height: number }
> = {
  widescreen: { width: 13.333, height: 7.5 },
  standard: { width: 10, height: 7.5 },
}
