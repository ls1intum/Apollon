import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_PPTX_PERSISTED_SETTINGS,
  loadPptxSettings,
  savePptxSettings,
} from "../../src/lib/pptxExportSettings"

const KEY = "apollon.pptxExportSettings.v1"

describe("pptxExportSettings", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it("returns defaults when no settings are stored", () => {
    expect(loadPptxSettings()).toEqual(DEFAULT_PPTX_PERSISTED_SETTINGS)
  })

  it("round-trips a save+load", () => {
    savePptxSettings({
      slideSize: "widescreen",
      diagramFit: "fill",
      fontFace: "Aptos",
      background: "transparent",
    })
    expect(loadPptxSettings()).toEqual({
      slideSize: "widescreen",
      diagramFit: "fill",
      fontFace: "Aptos",
      background: "transparent",
    })
  })

  it("ignores unknown values and falls back to defaults per field", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        slideSize: "huge",
        diagramFit: "bizarre",
        fontFace: "Comic Sans",
        background: "rainbow",
      })
    )
    expect(loadPptxSettings()).toEqual(DEFAULT_PPTX_PERSISTED_SETTINGS)
  })

  it("merges valid fields and falls back for invalid ones", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        slideSize: "standard", // valid
        fontFace: 42, // invalid
      })
    )
    const loaded = loadPptxSettings()
    expect(loaded.slideSize).toBe("standard")
    expect(loaded.fontFace).toBe(DEFAULT_PPTX_PERSISTED_SETTINGS.fontFace)
  })

  it("returns defaults when JSON is corrupt", () => {
    localStorage.setItem(KEY, "{not valid json")
    expect(loadPptxSettings()).toEqual(DEFAULT_PPTX_PERSISTED_SETTINGS)
  })
})
