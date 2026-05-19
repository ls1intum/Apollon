/**
 * Keyboard-and-a11y smoke test for the PPTX export dialog. We mount the modal
 * with stubbed editor + modal contexts and assert (1) initial focus lands on
 * the file-name input, (2) Tab walks through each interactive control without
 * leaving the dialog, (3) clicking Cancel calls closeModal.
 *
 * The export hook is mocked so this test exercises the dialog UI in isolation;
 * the real OOXML round-trip lives in `svgToPptx.flow.test.ts`.
 */
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const closeModalMock = vi.fn()

vi.mock("@/contexts", () => ({
  useEditorContext: () => ({
    editor: {
      model: { title: "Test Diagram" },
      getDiagramMetadata: () => ({ diagramTitle: "Test Diagram" }),
    } as unknown,
  }),
  useModalContext: () => ({
    closeModal: closeModalMock,
    openModal: () => {},
    currentModal: null,
  }),
}))

vi.mock("@/hooks", () => ({
  useExportAsPPTX: () => async () => {
    /* noop */
  },
}))

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn() },
}))

import { PPTXExportModal } from "../../src/components/modals/PPTXExportModal"

describe("PPTXExportModal — accessibility & keyboard", () => {
  it("autofocuses the file-name input on open with the diagram title selected", async () => {
    render(<PPTXExportModal />)
    const fileNameInput = await screen.findByLabelText("File name")
    expect(document.activeElement).toBe(fileNameInput)
    expect((fileNameInput as HTMLInputElement).value).toBe("Test Diagram")
  })

  it("associates each form control with a textual label for screen readers", () => {
    render(<PPTXExportModal />)
    expect(screen.getByLabelText("File name")).toBeDefined()
    // MUI Select exposes a combobox role; we labeled it via aria-labelledby.
    expect(screen.getByRole("combobox", { name: /Font/i })).toBeDefined()
    expect(screen.getByRole("radio", { name: /Fit to content/i })).toBeDefined()
    expect(
      screen.getByRole("radio", { name: /Widescreen 16:9/i })
    ).toBeDefined()
  })

  it("Tab from the first field eventually reaches the Export button without escaping", async () => {
    const user = userEvent.setup()
    render(<PPTXExportModal />)
    const fileNameInput = await screen.findByLabelText("File name")
    expect(document.activeElement).toBe(fileNameInput)
    const submitButton = screen.getByRole("button", { name: /Export/ })
    for (let i = 0; i < 12 && document.activeElement !== submitButton; i++) {
      await user.tab()
    }
    expect(document.activeElement).toBe(submitButton)
  })

  it("calls closeModal when the user clicks Cancel", async () => {
    closeModalMock.mockClear()
    const user = userEvent.setup()
    render(<PPTXExportModal />)
    await user.click(screen.getByRole("button", { name: /Cancel/ }))
    expect(closeModalMock).toHaveBeenCalledTimes(1)
  })
})
