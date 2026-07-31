import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { createPortal } from "react-dom"
import {
  ApollonPortalContainerProvider,
  ApollonPortalRoot,
  useApollonPortalContainer,
} from "@/components/ui/portalContainer"

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

function PortalContainerProbe({ name }: { name: string }) {
  const container = useApollonPortalContainer()
  return (
    <span data-testid={`${name}-destination`}>
      {container === document.body ? "body" : name}
    </span>
  )
}

function PortalSurface({ name }: { name: string }) {
  const container = useApollonPortalContainer()
  return createPortal(<div data-testid={`${name}-surface`} />, container)
}

function TestEditor({ name }: { name: string }) {
  return (
    <section data-testid={name}>
      <ApollonPortalContainerProvider>
        <PortalContainerProbe name={name} />
        <PortalSurface name={name} />
        <ApollonPortalRoot />
      </ApollonPortalContainerProvider>
    </section>
  )
}

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

describe("fullscreen-safe portal container", () => {
  it("treats an omitted fullscreenElement as an ordinary embed", () => {
    Reflect.deleteProperty(document, "fullscreenElement")
    render(<TestEditor name="first" />)

    expect(screen.getByTestId("first-destination")).toHaveTextContent("body")
    expect(screen.getByTestId("first-surface").parentElement).toBe(
      document.body
    )
  })

  it("uses body outside fullscreen and the editor-owned root in fullscreen", () => {
    setFullscreenElement(null)
    render(<TestEditor name="first" />)

    const editor = screen.getByTestId("first")
    const root = editor.querySelector("[data-apollon-portal-root]")
    expect(root).not.toBeNull()
    expect(screen.getByTestId("first-destination")).toHaveTextContent("body")
    expect(screen.getByTestId("first-surface").parentElement).toBe(
      document.body
    )

    act(() => {
      setFullscreenElement(editor)
      document.dispatchEvent(new Event("fullscreenchange"))
    })

    expect(screen.getByTestId("first-destination")).toHaveTextContent("first")
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

    expect(screen.getByTestId("first-destination")).toHaveTextContent("first")
    expect(screen.getByTestId("second-destination")).toHaveTextContent("body")
    expect(screen.getByTestId("first-surface").closest("section")).toBe(
      screen.getByTestId("first")
    )
    expect(screen.getByTestId("second-surface").parentElement).toBe(
      document.body
    )
  })

  it("preserves the body portal for document-root fullscreen and removes roots on unmount", () => {
    setFullscreenElement(document.documentElement)
    const { unmount } = render(<TestEditor name="first" />)

    expect(screen.getByTestId("first-destination")).toHaveTextContent("body")
    expect(screen.getByTestId("first-surface").parentElement).toBe(
      document.body
    )
    expect(
      document.querySelectorAll("[data-apollon-portal-root]")
    ).toHaveLength(1)

    unmount()
    expect(
      document.querySelectorAll("[data-apollon-portal-root]")
    ).toHaveLength(0)
  })
})
