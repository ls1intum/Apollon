import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import * as Y from "yjs"
import { TagChips, TagPicker } from "@/components/popovers/TagPicker"
import { createMetadataStore } from "@/store/metadataStore"
import { MetadataStoreContext } from "@/store/context"
import { resolveTagConfig, type TagOptions } from "@/utils/tagUtils"

// The row pairs the chips (TagChips) with the button (TagPicker); render both so
// a test can assert on either, as the popovers do.
const renderPicker = (
  tags: string[],
  options: boolean | TagOptions | undefined
) => {
  const onChange = vi.fn()
  const store = createMetadataStore(new Y.Doc())
  store.getState().setTagConfig(resolveTagConfig(options))
  render(
    <MetadataStoreContext.Provider value={store}>
      <TagChips tags={tags} onChange={onChange} />
      <TagPicker tags={tags} onChange={onChange} subject="attribute" />
    </MetadataStoreContext.Provider>
  )
  return onChange
}

const openPopover = () =>
  fireEvent.click(screen.getByRole("button", { name: "Tags for attribute" }))

describe("TagPicker gating", () => {
  it("renders nothing until a host enables tagging", () => {
    const { container } = render(
      (() => {
        const store = createMetadataStore(new Y.Doc())
        return (
          <MetadataStoreContext.Provider value={store}>
            <TagPicker tags={["x"]} onChange={vi.fn()} subject="attribute" />
          </MetadataStoreContext.Provider>
        )
      })()
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the tag control once enabled", () => {
    renderPicker([], true)
    expect(
      screen.getByRole("button", { name: "Tags for attribute" })
    ).toBeInTheDocument()
  })
})

describe("TagPicker free-form (tags: true)", () => {
  it("adds a tag typed into the add field", () => {
    const onChange = renderPicker([], true)
    openPopover()
    fireEvent.change(screen.getByLabelText("New tag"), {
      target: { value: "testA" },
    })
    fireEvent.keyDown(screen.getByLabelText("New tag"), { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(["testA"])
  })

  it("removes a tag through its chip", () => {
    const onChange = renderPicker(["keep", "drop"], true)
    fireEvent.click(screen.getByRole("button", { name: "Remove tag drop" }))
    expect(onChange).toHaveBeenCalledWith(["keep"])
  })
})

describe("TagPicker with a host vocabulary", () => {
  const available = ["testAttributes[Animal]", "testMethods[Animal]"]

  it("lists the whole vocabulary as focusable buttons, no search box", () => {
    renderPicker([], { available })
    openPopover()
    // Options are native buttons (keyboard-operable), not click-only list items.
    expect(
      within(screen.getByRole("group")).getAllByRole("button")
    ).toHaveLength(2)
    // Pick-only: no add field.
    expect(screen.queryByLabelText("New tag")).not.toBeInTheDocument()
  })

  it("toggles a vocabulary choice on", () => {
    const onChange = renderPicker([], { available })
    openPopover()
    fireEvent.click(
      screen.getByRole("button", { name: "testAttributes[Animal]" })
    )
    expect(onChange).toHaveBeenCalledWith(["testAttributes[Animal]"])
  })

  it("offers an add field only when allowCreate is set", () => {
    const onChange = renderPicker([], { available, allowCreate: true })
    openPopover()
    fireEvent.change(screen.getByLabelText("New tag"), {
      target: { value: "brandNew" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }))
    expect(onChange).toHaveBeenCalledWith(["brandNew"])
  })

  it("keeps a tag already on the element even if it is off-vocabulary", () => {
    renderPicker(["legacyTag"], { available })
    // The chip shows outside the popover…
    expect(
      screen.getByRole("button", { name: "Remove tag legacyTag" })
    ).toBeInTheDocument()
    // …and the option shows inside it, pressed.
    openPopover()
    const option = within(screen.getByRole("group")).getByRole("button", {
      name: "legacyTag",
    })
    expect(option).toHaveAttribute("aria-pressed", "true")
  })
})
