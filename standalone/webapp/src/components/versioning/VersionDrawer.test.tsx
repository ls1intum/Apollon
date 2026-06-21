/**
 * Guards against the "getSnapshot should be cached" infinite render loop: a
 * selector like `useVersionStore((s) => s.versions[diagramId] ?? [])` that
 * returns a fresh empty-array literal each call makes Zustand's
 * `useSyncExternalStore` detect a "change" every render → "Maximum update depth
 * exceeded". The version store must return a stable reference for a diagram with
 * no entries.
 *
 * Mounting the version panel body (open) on a never-fetched diagram must:
 *   - fire no React error boundary,
 *   - emit no cached-snapshot console warning,
 *   - render the empty state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, screen } from "@testing-library/react"
import { renderWithRouter } from "@/test/renderWithRouter"
import { ModalProvider, EditorProvider } from "@/contexts"
import { VersionSidebarBody } from "./VersionDrawer"
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
