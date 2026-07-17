/**
 * Version panel body: list rendering, the composer's optimistic row, and the
 * failure surfaces that only exist in this component (they are not covered by
 * the query-layer tests).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClientProvider } from "@tanstack/react-query"
import { renderWithRouter } from "@/test/renderWithRouter"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { ModalProvider, EditorProvider } from "@/contexts"
import { VersionSidebarBody } from "./VersionDrawer"
import { useVersionStore } from "@/stores/useVersionStore"
import { ApiError, VersionApiClient } from "@/services/DiagramApiClient"
import type { VersionSummary } from "@/types"
import { toast } from "react-toastify"

const DIAGRAM_ID = "abc"

function summary(id: string, overrides: Partial<VersionSummary> = {}) {
  return {
    id,
    diagramId: DIAGRAM_ID,
    name: id,
    description: id,
    createdAt: "2026-04-29T12:00:00Z",
    kind: "user" as const,
    librarySchemaVersion: "4.0.0",
    seq: 1,
    ...overrides,
  }
}

beforeEach(() => {
  // The panel's version query fetches on mount (through the default
  // RemoteVersionRepository). Stub the API so the test runs hermetically.
  vi.spyOn(VersionApiClient, "list").mockResolvedValue({
    versions: [],
    nextCursor: undefined,
    total: 0,
  })
})

afterEach(() => {
  cleanup()
  // Reset store between tests so persisted drawer state from prior tests
  // doesn't leak.
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    preview: null,
    undoRestore: null,
  })
  localStorage.clear()
  vi.restoreAllMocks()
})

// The body is the chrome-free panel content reused by the desktop rail and the
// mobile drawer; testing it directly exercises the version list wiring without
// the editor-portal plumbing (VersionRail needs a live editor to portal into).
function mount(diagramId: string) {
  const queryClient = createTestQueryClient()
  return renderWithRouter(<VersionSidebarBody diagramId={diagramId} />, {
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>
        <EditorProvider>
          <ModalProvider>{children}</ModalProvider>
        </EditorProvider>
      </QueryClientProvider>
    ),
  })
}

describe("VersionSidebarBody (regression: infinite render loop)", () => {
  it("mounts open without warnings + renders the empty state", async () => {
    useVersionStore.setState((s) => ({
      drawerOpenByDiagram: { ...s.drawerOpenByDiagram, abc: true },
    }))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => mount("abc")).not.toThrow()
    // Section subtitle ("No version saved yet") should render in place of
    // the previous standalone empty-state heading.
    expect(await screen.findByText(/no version saved yet/i)).toBeDefined()
    const warnings = warn.mock.calls.map((c) => String(c[0])).join("\n")
    const errors = error.mock.calls.map((c) => String(c[0])).join("\n")
    expect(warnings).not.toMatch(/getSnapshot should be cached/)
    expect(errors).not.toMatch(/Maximum update depth exceeded/)
    warn.mockRestore()
    error.mockRestore()
  })
})

describe("VersionSidebarBody — list failure surfaces", () => {
  it("shows the degraded-history copy when the backend reports REDIS_UNAVAILABLE", async () => {
    vi.mocked(VersionApiClient.list).mockRejectedValue(
      new ApiError(503, "REDIS_UNAVAILABLE", "redis down")
    )
    mount(DIAGRAM_ID)
    expect(
      await screen.findByText(/version history is temporarily unavailable/i)
    ).toBeDefined()
  })

  it("toasts when loading an older page fails", async () => {
    const errorToast = vi.spyOn(toast, "error")
    vi.mocked(VersionApiClient.list)
      .mockResolvedValueOnce({
        versions: [summary("v2")],
        nextCursor: "cursor-1",
        total: 2,
      })
      .mockRejectedValueOnce(new Error("boom"))

    mount(DIAGRAM_ID)
    const loadMore = await screen.findByRole("button", {
      name: /load older versions/i,
    })
    await userEvent.click(loadMore)

    // `fetchNextPage` resolves even on failure unless `throwOnError` is set —
    // without it this toast is unreachable and the user gets no feedback.
    await waitFor(() =>
      expect(errorToast).toHaveBeenCalledWith("Failed to load more versions.")
    )
  })
})
