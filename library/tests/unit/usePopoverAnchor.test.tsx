import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"

// usePopoverAnchor backs popover anchoring for every node and the edge toolbar
// (~51 call sites). The property under test: the callback ref captures the
// mounted element into state, so the anchor is populated for the next render —
// unlike the old `useRef().current` read, which was null on first render and
// never re-rendered, leaving the popover anchorless. Each test renders the
// captured element's tag into the DOM; a regression to `useRef` would leave it
// "unmounted" and fail these assertions. The edge toolbar's prop-wiring
// (callback ref → <foreignObject>, anchorEl → PopoverManager) is type-checked
// end-to-end, not re-rendered here — the mechanism it relies on is this hook.

describe("usePopoverAnchor", () => {
  it("captures the mounted HTML element into state (node popover usage)", () => {
    function Consumer() {
      const [anchorEl, anchorRef] = usePopoverAnchor<HTMLDivElement>()
      return (
        <div ref={anchorRef} data-testid="box">
          {anchorEl ? anchorEl.tagName : "unmounted"}
        </div>
      )
    }

    expect(render(<Consumer />).getByTestId("box").textContent).toBe("DIV")
  })

  it("captures an SVGForeignObjectElement anchor (edge toolbar usage)", () => {
    function Consumer() {
      const [anchorEl, anchorRef] = usePopoverAnchor<SVGForeignObjectElement>()
      return (
        <svg>
          <foreignObject ref={anchorRef} data-testid="fo" width={1} height={1}>
            {anchorEl ? anchorEl.tagName : "unmounted"}
          </foreignObject>
        </svg>
      )
    }

    expect(render(<Consumer />).getByTestId("fo").textContent).toBe(
      "foreignObject"
    )
  })
})
