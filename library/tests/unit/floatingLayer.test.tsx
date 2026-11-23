import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { createPortal } from "react-dom"
import {
  ApollonPortalContainerProvider,
  ApollonPortalRoot,
  FLOATING_SURFACE_CLASS,
  floatingPositionerProps,
  isInsideModalLayer,
  useApollonFloatingLayer,
} from "@/components/ui/floatingLayer"

const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  "fullscreenElement"
)

function setFullscreenElement(element: Element | null): void {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  })
}

function LayerProbe({ name }: { name: string }) {
  const layer = useApollonFloatingLayer()
  return (
    <span
      data-testid={`${name}-destination`}
      data-position-method={layer.positionMethod}
    >
      {layer.container === document.body ? "body" : name}
    </span>
  )
}

function PortalSurface({ name }: { name: string }) {
  const layer = useApollonFloatingLayer()
  return createPortal(<div data-testid={`${name}-surface`} />, layer.container)
}

function TestEditor({ name }: { name: string }) {
  return (
    <section data-testid={name}>
      <ApollonPortalContainerProvider>
        <LayerProbe name={name} />
        <PortalSurface name={name} />
        <ApollonPortalRoot />
      </ApollonPortalContainerProvider>
    </section>
  )
}

const destination = (name: string) => screen.getByTestId(`${name}-destination`)

afterEach(() => {
  cleanup()
  if (originalFullscreenElement) {
    Object.defineProperty(
      document,
      "fullscreenElement",
      originalFullscreenElement
    )
  } else {
    Reflect.deleteProperty(document, "fullscreenElement")
  }
})

describe("floating layer on an ordinary page", () => {
  it("portals to the body with absolute positioning", () => {
    Reflect.deleteProperty(document, "fullscreenElement")
    render(<TestEditor name="first" />)

    expect(destination("first")).toHaveTextContent("body")
    expect(destination("first")).toHaveAttribute(
      "data-position-method",
      "absolute"
    )
    expect(screen.getByTestId("first-surface").parentElement).toBe(
      document.body
    )
  })

  it("stacks every positioner through the shared surface class", () => {
    expect(
      floatingPositionerProps({
        container: document.body,
        positionMethod: "absolute",
      })
    ).toEqual({ className: FLOATING_SURFACE_CLASS, positionMethod: "absolute" })
  })
})

describe("floating layer inside a host modal", () => {
  it("stays in the editor under an aria-modal dialog, positioned fixed", () => {
    render(
      <div role="dialog" aria-modal="true">
        <TestEditor name="first" />
      </div>
    )

    expect(destination("first")).toHaveTextContent("first")
    expect(destination("first")).toHaveAttribute(
      "data-position-method",
      "fixed"
    )
    expect(
      screen.getByTestId("first-surface").closest("[data-apollon-portal-root]")
    ).not.toBeNull()
  })

  it("ignores a dialog that does not claim to be modal", () => {
    render(
      <div role="dialog" aria-modal="false">
        <TestEditor name="first" />
      </div>
    )

    expect(destination("first")).toHaveTextContent("body")
  })

  it("only captures the editor that sits inside the modal", () => {
    render(
      <>
        <div role="dialog" aria-modal="true">
          <TestEditor name="inside" />
        </div>
        <TestEditor name="outside" />
      </>
    )

    expect(destination("inside")).toHaveTextContent("inside")
    expect(destination("outside")).toHaveTextContent("body")
  })

  it("re-portals open surfaces when a layer toggles", () => {
    render(
      <div data-testid="host">
        <TestEditor name="first" />
      </div>
    )
    expect(destination("first")).toHaveTextContent("body")

    const host = screen.getByTestId("host")
    act(() => {
      host.setAttribute("aria-modal", "true")
      // `toggle` does not bubble; the layer listens in the capture phase.
      host.dispatchEvent(new Event("toggle", { bubbles: false }))
    })
    expect(destination("first")).toHaveTextContent("first")
    expect(
      screen.getByTestId("first-surface").closest("[data-apollon-portal-root]")
    ).not.toBeNull()

    act(() => {
      host.removeAttribute("aria-modal")
      host.dispatchEvent(new Event("toggle", { bubbles: false }))
    })
    expect(destination("first")).toHaveTextContent("body")
    expect(screen.getByTestId("first-surface").parentElement).toBe(
      document.body
    )
  })
})

describe("floating layer in fullscreen", () => {
  it("uses body outside fullscreen and the editor-owned root in fullscreen", () => {
    setFullscreenElement(null)
    render(<TestEditor name="first" />)

    const editor = screen.getByTestId("first")
    expect(editor.querySelector("[data-apollon-portal-root]")).not.toBeNull()
    expect(destination("first")).toHaveTextContent("body")

    act(() => {
      setFullscreenElement(editor)
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    expect(destination("first")).toHaveTextContent("first")
    expect(destination("first")).toHaveAttribute(
      "data-position-method",
      "fixed"
    )
    expect(screen.getByTestId("first-surface").closest("section")).toBe(editor)
  })

  it("keeps editor instances isolated during subtree fullscreen", () => {
    setFullscreenElement(null)
    render(
      <>
        <TestEditor name="first" />
        <TestEditor name="second" />
      </>
    )

    act(() => {
      setFullscreenElement(screen.getByTestId("first"))
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    expect(destination("first")).toHaveTextContent("first")
    expect(destination("second")).toHaveTextContent("body")
    expect(screen.getByTestId("second-surface").parentElement).toBe(
      document.body
    )
  })

  it("keeps the body portal for document-root fullscreen and removes roots on unmount", () => {
    setFullscreenElement(document.documentElement)
    const { unmount } = render(<TestEditor name="first" />)

    expect(destination("first")).toHaveTextContent("body")
    expect(
      document.querySelectorAll("[data-apollon-portal-root]")
    ).toHaveLength(1)

    unmount()
    expect(
      document.querySelectorAll("[data-apollon-portal-root]")
    ).toHaveLength(0)
  })
})

describe("isInsideModalLayer", () => {
  it("answers for detached and plain elements without throwing", () => {
    const element = document.createElement("div")
    expect(isInsideModalLayer(element)).toBe(false)
    document.body.append(element)
    expect(isInsideModalLayer(element)).toBe(false)
    element.remove()
  })
})
