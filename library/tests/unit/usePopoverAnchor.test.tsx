import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"

describe("usePopoverAnchor", () => {
  it("captures the mounted element into state", () => {
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
})
