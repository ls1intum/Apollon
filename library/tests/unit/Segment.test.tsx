import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Segment } from "@/edges/Segment"

describe("Segment Component", () => {
  it("renders visible and hit-area lines correctly for horizontal segment", () => {
    const { container } = render(
      <svg>
        <Segment
          start={{ x: 0, y: 10 }}
          end={{ x: 100, y: 10 }}
          orientation="H"
        />
      </svg>
    )
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBe(2)

    const visibleLine = lines[0]
    expect(visibleLine.getAttribute("pointer-events")).toBe("none")

    const hitArea = lines[1]
    expect(hitArea.getAttribute("stroke")).toBe("transparent")
    expect(hitArea.getAttribute("stroke-width")).toBe("20")
    expect(hitArea.getAttribute("cursor")).toBe("row-resize")
  })

  it("renders hit-area cursor correctly for vertical segment", () => {
    const { container } = render(
      <svg>
        <Segment
          start={{ x: 10, y: 0 }}
          end={{ x: 10, y: 100 }}
          orientation="V"
        />
      </svg>
    )
    const lines = container.querySelectorAll("line")
    const hitArea = lines[1]
    expect(hitArea.getAttribute("cursor")).toBe("col-resize")
  })

  it("suppresses pointer events and cursor when interactive=false", () => {
    const handler = vi.fn()
    const { container } = render(
      <svg>
        <Segment
          start={{ x: 0, y: 10 }}
          end={{ x: 100, y: 10 }}
          orientation="H"
          onPointerDown={handler}
          interactive={false}
        />
      </svg>
    )
    const lines = container.querySelectorAll("line")
    const hitArea = lines[1]
    expect(hitArea.getAttribute("cursor")).toBeNull()
    expect(hitArea.getAttribute("pointer-events")).toBe("none")
  })
})
