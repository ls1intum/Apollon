/**
 * The clickable version row must be a real anchor to `?version=<id>` so
 * cmd/ctrl/middle-click opens the preview in a new tab (like gallery cards),
 * while plain left-click stays in-SPA via onPreview.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithRouter } from "@/test/renderWithRouter"
import { VersionListItem } from "./VersionListItem"
import type { PendingVersion } from "@/stores/useVersionStore"

vi.mock("./VersionThumbnail", () => ({ VersionThumbnail: () => null }))
vi.mock("@/services/versionRepository", () => ({
  getVersionRepository: () => ({ permalink: () => null }),
}))

const version = {
  id: "v1",
  diagramId: "d1",
  name: "",
  description: "First",
  seq: 1,
  createdAt: new Date(0).toISOString(),
  kind: "user",
} as unknown as PendingVersion

function renderRow(
  overrides: Partial<PendingVersion> = {},
  onPreview = vi.fn()
) {
  return {
    onPreview,
    ...renderWithRouter(
      <VersionListItem
        diagramId="d1"
        version={{ ...version, ...overrides }}
        versionNumber={1}
        isPreviewing={false}
        canRestore
        onPreview={onPreview}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />,
      { initialEntry: "/local/d1", routePaths: ["/local/$id"] }
    ),
  }
}

afterEach(cleanup)

describe("VersionListItem row navigation", () => {
  it("renders the row body as an anchor to ?version=<id>", async () => {
    renderRow()
    const link = await screen.findByRole("link")
    expect(link.getAttribute("href")).toContain("version=v1")
  })

  it("plain click previews in-SPA without navigating", async () => {
    const { onPreview, router } = renderRow()
    await userEvent.click(await screen.findByRole("link"))
    expect(onPreview).toHaveBeenCalledWith("v1")
    // Plain click is intercepted (preventDefault) — the URL must not change.
    expect(router.state.location.search).not.toHaveProperty("version")
  })

  it("does not render an anchor for a pending row", async () => {
    renderRow({ pending: true })
    await screen.findByRole("option")
    expect(screen.queryByRole("link")).toBeNull()
  })
})
