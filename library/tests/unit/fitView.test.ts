import { afterEach, describe, expect, it, vi } from "vitest"
import { insetAwareFitView, readSafeArea } from "@/overlay/fitView"
import { ZERO_INSETS, type Insets } from "@/overlay/types"
import {
  ARRANGE_FIT_VIEW_DURATION_MS,
  fitArrangedDiagram,
} from "@/layout/fitView"

const insets = (partial: Partial<Insets> = {}): Insets => ({
  ...ZERO_INSETS,
  ...partial,
})

/** Capture the `padding` React Flow is asked to fit with. */
const fitSpy = () => {
  const fitView = vi.fn()
  return { rf: { fitView }, fitView }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("insetAwareFitView", () => {
  it("falls back to a fraction fit when nothing is reserved", () => {
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, ZERO_INSETS, ZERO_INSETS)
    expect(fitView).toHaveBeenCalledWith(
      expect.objectContaining({ padding: 0.15 })
    )
  })

  it("clears the device safe area even with no chrome registered", () => {
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, ZERO_INSETS, insets({ top: 47, bottom: 34 }))
    expect(fitView.mock.calls[0][0].padding).toEqual({
      top: "63px", // 47 notch + 16 gutter
      right: "16px",
      bottom: "50px", // 34 home indicator + 16 gutter
      left: "16px",
    })
  })

  it("stacks the safe area on top of measured chrome without double counting", () => {
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, insets({ top: 48 }), insets({ top: 47 }))
    expect(fitView.mock.calls[0][0].padding.top).toBe("111px") // 47 + 48 + 16
  })

  it("clears the safe area on an edge whose chrome floats and reserves nothing", () => {
    // The zoom cluster is a corner slot: it contributes 0 to `insets`, but the
    // home indicator still occludes the bottom of the canvas.
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, ZERO_INSETS, insets({ bottom: 34 }))
    expect(fitView.mock.calls[0][0].padding.bottom).toBe("50px")
  })

  it("lets a per-side padding override replace the gutter but never the safe area", () => {
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, ZERO_INSETS, insets({ top: 47 }), {
      padding: { top: 0 },
    })
    expect(fitView.mock.calls[0][0].padding.top).toBe("47px")
  })

  it("passes duration and caps the zoom at 1", () => {
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, insets({ top: 10 }), ZERO_INSETS, { duration: 300 })
    expect(fitView.mock.calls[0][0]).toMatchObject({
      duration: 300,
      maxZoom: 1.0,
    })
  })

  it("removes viewport animation when reduced motion is requested", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }) as MediaQueryList)
    )
    const { rf, fitView } = fitSpy()
    insetAwareFitView(rf, ZERO_INSETS, ZERO_INSETS, { duration: 300 })

    expect(fitView).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 0 })
    )
  })
})

describe("fitArrangedDiagram", () => {
  it("uses the shared inset-aware fit with the arrangement duration", () => {
    const { rf, fitView } = fitSpy()
    fitArrangedDiagram(rf, insets({ top: 40 }), insets({ bottom: 20 }))

    expect(fitView).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: ARRANGE_FIT_VIEW_DURATION_MS,
        maxZoom: 1,
        padding: {
          top: "56px",
          right: "16px",
          bottom: "36px",
          left: "16px",
        },
      })
    )
  })

  it("preserves the viewport when disabled", () => {
    const { rf, fitView } = fitSpy()
    fitArrangedDiagram(rf, ZERO_INSETS, ZERO_INSETS, false)
    expect(fitView).not.toHaveBeenCalled()
  })

  it("honors custom fit options while always clearing the safe area", () => {
    const { rf, fitView } = fitSpy()
    fitArrangedDiagram(rf, insets({ top: 40 }), insets({ top: 8 }), {
      duration: 325,
      padding: { left: 4 },
      respectInsets: false,
    })

    expect(fitView).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 325,
        padding: {
          top: "24px",
          right: "16px",
          bottom: "16px",
          left: "4px",
        },
      })
    )
  })
})

describe("readSafeArea", () => {
  it("is zero without a grid element", () => {
    expect(readSafeArea(null)).toEqual(ZERO_INSETS)
  })

  it("reads the grid's resolved padding", () => {
    const grid = document.createElement("div")
    grid.style.padding = "47px 0px 34px 12px"
    document.body.appendChild(grid)
    expect(readSafeArea(grid)).toEqual({
      top: 47,
      right: 0,
      bottom: 34,
      left: 12,
    })
    grid.remove()
  })
})
