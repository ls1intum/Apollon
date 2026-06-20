/**
 * Regression test for the "getSnapshot should be cached" infinite-loop bug.
 *
 * The pre-fix selector `useVersionStore((s) => s.versions[diagramId] ?? [])`
 * returned a fresh empty-array literal every call when the diagram had no
 * entry, causing Zustand's `useSyncExternalStore` to detect a "change" each
 * render and trigger "Maximum update depth exceeded".
 *
 * This test mounts the VersionDrawer (open) on a diagram that's never been
 * fetched — exactly the failing path from the user's report — and asserts:
 *   - no React error boundary fires,
 *   - the test environment console doesn't emit the cached-snapshot warning,
 *   - the empty state renders.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen } from "@testing-library/react"
import { renderWithRouter } from "@/test/renderWithRouter"
import { ModalProvider, EditorProvider } from "@/contexts"
import { VersionSidebarBody, VersionRail } from "./VersionDrawer"
import { useVersionStore } from "@/stores/useVersionStore"
import { VersionApiClient } from "@/services/DiagramApiClient"

beforeEach(() => {
  // The open drawer auto-fetches versions on mount. Stub the API so the
  // test runs hermetically.
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
    versions: {},
    nextCursor: {},
    preview: null,
    undoRestore: null,
    loading: {},
    error: {},
  })
  localStorage.clear()
})

// The body is the chrome-free panel content reused by the desktop rail and the
// mobile drawer; testing it directly exercises the version selectors without the
// editor-portal plumbing (VersionRail needs a live editor to portal into).
function mount(diagramId: string) {
  return renderWithRouter(<VersionSidebarBody diagramId={diagramId} />, {
    wrapper: (children) => (
      <EditorProvider>
        <ModalProvider>{children}</ModalProvider>
      </EditorProvider>
    ),
  })
}

describe("VersionRail (overlay rehome)", () => {
  it("renders nothing (no throw) when there is no editor to portal into", () => {
    expect(() =>
      renderWithRouter(<VersionRail diagramId="no-editor" />, {
        wrapper: (children) => (
          <EditorProvider>
            <ModalProvider>{children}</ModalProvider>
          </EditorProvider>
        ),
      })
    ).not.toThrow()
  })
})

describe("VersionSidebarBody (regression: infinite render loop)", () => {
  it("mounts without warnings on a diagram with no fetched versions", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => mount("never-fetched")).not.toThrow()
    const warnings = warn.mock.calls.map((c) => String(c[0])).join("\n")
    const errors = error.mock.calls.map((c) => String(c[0])).join("\n")
    expect(warnings).not.toMatch(/getSnapshot should be cached/)
    expect(errors).not.toMatch(/Maximum update depth exceeded/)
    warn.mockRestore()
    error.mockRestore()
  })

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
