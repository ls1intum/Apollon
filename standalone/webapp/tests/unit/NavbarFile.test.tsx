/**
 * Behavioural test: when an export hook throws, NavbarFile catches and toasts
 * with an actionable message based on the error class. This is the user-facing
 * contract that closes #667 — failures must surface, not be swallowed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mocks = vi.hoisted(() => ({
  exportAsSvg: vi.fn(),
  exportAsPng: vi.fn(),
  exportAsPdf: vi.fn(),
  exportAsJson: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(() => "progress-toast-id"),
  toastWarning: vi.fn(),
  toastDismiss: vi.fn(),
  openModal: vi.fn(),
}))

vi.mock("@/contexts", () => ({
  useModalContext: () => ({
    openModal: mocks.openModal,
    closeModal: vi.fn(),
  }),
}))

vi.mock("@/hooks", () => ({
  useExportAsSVG: () => mocks.exportAsSvg,
  useExportAsPNG: () => mocks.exportAsPng,
  useExportAsJSON: () => mocks.exportAsJson,
  useExportAsPDF: () => mocks.exportAsPdf,
}))

vi.mock("react-toastify", () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    warning: mocks.toastWarning,
    dismiss: mocks.toastDismiss,
  },
}))

vi.mock("@/components/navbar/JsonFileImportButton", () => ({
  JsonFileImportButton: () => null,
}))

import { NavbarFile } from "../../src/components/navbar/NavbarFile"
import {
  RasterTimeoutError,
  RasterTooLargeError,
} from "../../src/utils/exportErrors"

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.toastInfo.mockReturnValue("progress-toast-id")
  mocks.exportAsSvg.mockResolvedValue(undefined)
  mocks.exportAsPng.mockResolvedValue(undefined)
  mocks.exportAsPdf.mockResolvedValue(undefined)
})

async function openExportSubmenu() {
  const user = userEvent.setup()
  render(<NavbarFile />)
  await user.click(screen.getByRole("button", { name: /File/ }))
  await user.click(await screen.findByRole("menuitem", { name: /^Export/ }))
  return user
}

describe("NavbarFile export error handling", () => {
  it("toasts a 'too large' message when PNG export hits the canvas cap", async () => {
    mocks.exportAsPng.mockRejectedValue(
      new RasterTooLargeError("too big", 99_999, 99_999)
    )
    const user = await openExportSubmenu()
    await user.click(
      await screen.findByRole("menuitem", {
        name: /As PNG \(White Background\)/,
      })
    )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining("too large to export as PNG")
      )
    )
  })

  it("does not double-fire when an in-flight PNG export is clicked again", async () => {
    let resolveFirst: (() => void) | null = null
    mocks.exportAsPng.mockImplementation(
      () => new Promise<void>((res) => (resolveFirst = res))
    )
    const user = await openExportSubmenu()
    const firstClick = await screen.findByRole("menuitem", {
      name: /As PNG \(White Background\)/,
    })
    await user.click(firstClick)
    // While the first export is pending, the PNG menu items disable themselves.
    // Re-open the submenu and confirm the second click is a no-op.
    await user.click(screen.getByRole("button", { name: /File/ }))
    await user.click(await screen.findByRole("menuitem", { name: /^Export/ }))
    const secondClick = await screen.findByRole("menuitem", {
      name: /As PNG \(White Background\)/,
    })
    expect(secondClick.getAttribute("aria-disabled")).toBe("true")
    // userEvent refuses to click items with pointer-events: none (which MUI
    // applies to disabled MenuItems), so the click is structurally impossible
    // for a real user; assert the contract via the disabled attribute.
    resolveFirst?.()
    await waitFor(() => expect(mocks.exportAsPng).toHaveBeenCalledTimes(1))
  })

  it("toasts a timeout message when PNG export times out", async () => {
    mocks.exportAsPng.mockRejectedValue(new RasterTimeoutError("slow"))
    const user = await openExportSubmenu()
    await user.click(
      await screen.findByRole("menuitem", {
        name: /As PNG \(Transparent Background\)/,
      })
    )
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining("PNG export timed out")
      )
    )
  })

  it("toasts a generic message when PDF export fails", async () => {
    mocks.exportAsPdf.mockRejectedValue(new Error("boom"))
    const user = await openExportSubmenu()
    await user.click(await screen.findByRole("menuitem", { name: /As PDF/ }))
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining("PDF export failed")
      )
    )
  })

  it("does not toast on a successful PNG export", async () => {
    const user = await openExportSubmenu()
    await user.click(
      await screen.findByRole("menuitem", {
        name: /As PNG \(White Background\)/,
      })
    )
    await waitFor(() => expect(mocks.exportAsPng).toHaveBeenCalled())
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it("opens the PPTX modal without going through the export-error path", async () => {
    const user = await openExportSubmenu()
    await user.click(await screen.findByRole("menuitem", { name: /As PPTX/ }))
    expect(mocks.openModal).toHaveBeenCalledWith("EXPORT_PPTX")
  })

  it("shows a progress toast for PNG and dismisses it on success", async () => {
    const user = await openExportSubmenu()
    await user.click(
      await screen.findByRole("menuitem", {
        name: /As PNG \(White Background\)/,
      })
    )
    await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalled())
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      expect.stringMatching(/Exporting PNG/),
      expect.objectContaining({ autoClose: false, isLoading: true })
    )
    await waitFor(() =>
      expect(mocks.toastDismiss).toHaveBeenCalledWith("progress-toast-id")
    )
  })

  it("does NOT show a progress toast for SVG/JSON (sub-millisecond)", async () => {
    const user = await openExportSubmenu()
    await user.click(await screen.findByRole("menuitem", { name: /As SVG/ }))
    await waitFor(() => expect(mocks.exportAsSvg).toHaveBeenCalled())
    expect(mocks.toastInfo).not.toHaveBeenCalled()
  })

  it("warns when PNG is downsized to fit memory limits", async () => {
    mocks.exportAsPng.mockResolvedValue({ clamped: true, appliedScale: 0.75 })
    const user = await openExportSubmenu()
    await user.click(
      await screen.findByRole("menuitem", {
        name: /As PNG \(White Background\)/,
      })
    )
    await waitFor(() =>
      expect(mocks.toastWarning).toHaveBeenCalledWith(
        expect.stringContaining("downsized"),
        expect.any(Object)
      )
    )
  })
})
