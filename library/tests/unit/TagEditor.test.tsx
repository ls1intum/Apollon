import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as Y from "yjs"
import { TagEditor } from "@/components/popovers/TagEditor"
import { createMetadataStore } from "@/store/metadataStore"
import { MetadataStoreContext } from "@/store/context"

// TagEditor reads its strings through useLabels, which is store-backed.
const renderEditor = (tags: string[]) => {
  const onChange = vi.fn()
  const store = createMetadataStore(new Y.Doc())
  render(
    <MetadataStoreContext.Provider value={store}>
      <TagEditor tags={tags} onChange={onChange} subject="attribute" />
    </MetadataStoreContext.Provider>
  )
  return { onChange, input: screen.getByLabelText("New tag for attribute") }
}

describe("TagEditor", () => {
  it("commits the draft on Enter", () => {
    const { onChange, input } = renderEditor([])
    fireEvent.change(input, { target: { value: "testA" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(["testA"])
  })

  it("commits the draft on blur", () => {
    const { onChange, input } = renderEditor([])
    fireEvent.change(input, { target: { value: "testA" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(["testA"])
  })

  it("splits a comma-separated paste into several tags", () => {
    const { onChange, input } = renderEditor([])
    fireEvent.change(input, { target: { value: "testA, testB ,testC" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(["testA", "testB", "testC"])
  })

  it("appends to the existing tags and drops a duplicate", () => {
    const { onChange, input } = renderEditor(["existing"])
    fireEvent.change(input, { target: { value: "existing, fresh" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(["existing", "fresh"])
  })

  it("ignores a blank draft", () => {
    const { onChange, input } = renderEditor([])
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).not.toHaveBeenCalled()
  })

  it("clears the draft after committing", () => {
    const { input } = renderEditor([])
    fireEvent.change(input, { target: { value: "testA" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(input).toHaveValue("")
  })

  it("commits the draft through the add button", () => {
    const { onChange, input } = renderEditor([])
    fireEvent.change(input, { target: { value: "testA" } })
    fireEvent.click(
      screen.getByRole("button", { name: "Add tag for attribute" })
    )
    expect(onChange).toHaveBeenCalledWith(["testA"])
  })

  it("removes a tag through its chip button", () => {
    const { onChange } = renderEditor(["keep", "drop"])
    fireEvent.click(screen.getByRole("button", { name: "Remove tag drop" }))
    expect(onChange).toHaveBeenCalledWith(["keep"])
  })
})
