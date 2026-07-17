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
  it("creates a tag typed into the search field", () => {
    const onChange = renderPicker([], true)
    openPopover()
    fireEvent.change(screen.getByLabelText("Search tags"), {
      target: { value: "testA" },
    })
    fireEvent.click(screen.getByText('Create "testA"'))
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

  it("offers the vocabulary and toggles a choice on", () => {
    const onChange = renderPicker([], { available })
    openPopover()
    const list = screen.getByRole("listbox")
    expect(within(list).getAllByRole("option")).toHaveLength(2)
    fireEvent.click(within(list).getByText("testAttributes[Animal]"))
    expect(onChange).toHaveBeenCalledWith(["testAttributes[Animal]"])
  })

  it("filters the list by the search query", () => {
    renderPicker([], { available })
    openPopover()
    fireEvent.change(screen.getByLabelText("Search tags"), {
      target: { value: "Methods" },
    })
    const options = within(screen.getByRole("listbox")).getAllByRole("option")
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent("testMethods[Animal]")
  })

  it("cannot create off-vocabulary tags by default", () => {
    renderPicker([], { available })
    openPopover()
    fireEvent.change(screen.getByLabelText("Search tags"), {
      target: { value: "brandNew" },
    })
    expect(screen.queryByText('Create "brandNew"')).not.toBeInTheDocument()
    expect(screen.getByText("No tags")).toBeInTheDocument()
  })

  it("allows creating off-vocabulary tags when allowCreate is set", () => {
    const onChange = renderPicker([], { available, allowCreate: true })
    openPopover()
    fireEvent.change(screen.getByLabelText("Search tags"), {
      target: { value: "brandNew" },
    })
    fireEvent.click(screen.getByText('Create "brandNew"'))
    expect(onChange).toHaveBeenCalledWith(["brandNew"])
  })

  it("keeps a tag already on the element even if it is off-vocabulary", () => {
    renderPicker(["legacyTag"], { available })
    // The chip shows outside the popover…
    expect(
      screen.getByRole("button", { name: "Remove tag legacyTag" })
    ).toBeInTheDocument()
    // …and the option is selectable inside it.
    openPopover()
    expect(
      within(screen.getByRole("listbox")).getByText("legacyTag")
    ).toBeInTheDocument()
  })
})
