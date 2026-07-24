import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"
import { renderHook } from "@testing-library/react"
import { EditorContext } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import {
  createEditorShortcutHandler,
  useEditorShortcuts,
  type EditorShortcutId,
} from "./useEditorShortcuts"

const exportAsJSON = vi.hoisted(() => vi.fn(async () => {}))
vi.mock("./useExportAsJSON", () => ({ useExportAsJSON: () => exportAsJSON }))

/**
 * Events carry BOTH `key` and `code`, which is the whole point: the two
 * disagree exactly where these shortcuts are easy to get wrong — Dvorak moves
 * the S key's `code`, and macOS rewrites Alt combos' `key`.
 */
const press = (
  init: {
    key: string
    code: string
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    repeat?: boolean
    isComposing?: boolean
  },
  target: EventTarget = document.body
) => {
  const event = new KeyboardEvent("keydown", {
    ...init,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

describe("createEditorShortcutHandler", () => {
  let actions: Record<EditorShortcutId, Mock<() => void>>
  let onKeyDown: (event: KeyboardEvent) => void

  beforeEach(() => {
    actions = {
      "save-as-json": vi.fn(),
      "save-version": vi.fn(),
      "toggle-version-history": vi.fn(),
    }
    onKeyDown = createEditorShortcutHandler(actions)
    document.addEventListener("keydown", onKeyDown)
  })

  afterEach(() => {
    document.removeEventListener("keydown", onKeyDown)
    document.body.innerHTML = ""
  })

  it("routes each combo to its action and claims the key", () => {
    // Dvorak puts S on the physical `;` key: matching `code` would leave Mod+S
    // unhandled, and the browser's save-page dialog opens instead.
    const dvorakSave = press({ key: "s", code: "Semicolon", ctrlKey: true })
    expect(actions["save-as-json"]).toHaveBeenCalledOnce()
    expect(dvorakSave.defaultPrevented).toBe(true)

    press({ key: "s", code: "KeyS", metaKey: true })
    expect(actions["save-as-json"]).toHaveBeenCalledTimes(2)

    // Strict matching: Mod+Shift+S must not also save.
    press({ key: "S", code: "KeyS", ctrlKey: true, shiftKey: true })
    expect(actions["save-version"]).toHaveBeenCalledOnce()
    expect(actions["save-as-json"]).toHaveBeenCalledTimes(2)

    // macOS reports "˙" for ⌥⇧H, so this one matches the physical key.
    press({ key: "˙", code: "KeyH", altKey: true, shiftKey: true })
    expect(actions["toggle-version-history"]).toHaveBeenCalledOnce()
  })

  it("saves while typing, but never steals a key from the field otherwise", () => {
    document.body.innerHTML = "<input /><textarea></textarea>"
    const input = document.querySelector("input")!
    const textarea = document.querySelector("textarea")!

    press({ key: "s", code: "KeyS", ctrlKey: true }, input)
    expect(actions["save-as-json"]).toHaveBeenCalledOnce()

    // Toggling the drawer shut mid-sentence would discard what's being typed.
    press({ key: "˙", code: "KeyH", altKey: true, shiftKey: true }, textarea)
    press({ key: "S", code: "KeyS", ctrlKey: true, shiftKey: true }, input)
    expect(actions["toggle-version-history"]).not.toHaveBeenCalled()
    expect(actions["save-version"]).not.toHaveBeenCalled()
  })

  it("stands down mid-IME-composition, and inside an open dialog", () => {
    // Composing a CJK name with Mod+S in the sequence must not export.
    press({ key: "s", code: "KeyS", ctrlKey: true, isComposing: true })
    expect(actions["save-as-json"]).not.toHaveBeenCalled()

    document.body.innerHTML = '<div role="dialog"><button></button></div>'
    const inDialog = document.querySelector("button")!
    press({ key: "˙", code: "KeyH", altKey: true, shiftKey: true }, inDialog)
    expect(actions["toggle-version-history"]).not.toHaveBeenCalled()
  })

  it("holding Mod+S exports once, and unrelated keys do nothing", () => {
    press({ key: "s", code: "KeyS", ctrlKey: true })
    press({ key: "s", code: "KeyS", ctrlKey: true, repeat: true })
    expect(actions["save-as-json"]).toHaveBeenCalledOnce()

    press({ key: "s", code: "KeyS" })
    press({ key: "s", code: "KeyS", altKey: true })
    press({ key: "h", code: "KeyH", shiftKey: true })
    expect(actions["save-as-json"]).toHaveBeenCalledOnce()
    expect(actions["save-version"]).not.toHaveBeenCalled()
    expect(actions["toggle-version-history"]).not.toHaveBeenCalled()
  })
})

describe("useEditorShortcuts", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EditorContext
      value={{
        editor: undefined,
        diagramName: "",
        setDiagramName: vi.fn(),
        setEditor: vi.fn(),
      }}
    >
      {children}
    </EditorContext>
  )

  beforeEach(() => exportAsJSON.mockClear())

  it("stops listening once unmounted", () => {
    const { unmount } = renderHook(() => useEditorShortcuts("diagram-1"), {
      wrapper,
    })

    press({ key: "s", code: "KeyS", ctrlKey: true })
    expect(exportAsJSON).toHaveBeenCalledOnce()

    // A listener that outlives its page exports once per stale registration.
    unmount()
    press({ key: "s", code: "KeyS", ctrlKey: true })
    expect(exportAsJSON).toHaveBeenCalledOnce()
  })

  it("stays silent for a diagram that has no id yet", () => {
    renderHook(() => useEditorShortcuts(undefined), { wrapper })

    press({ key: "s", code: "KeyS", ctrlKey: true })
    expect(exportAsJSON).not.toHaveBeenCalled()
  })

  it("Mod+Shift+S opens the version panel and asks it to save", () => {
    useVersionStore.setState({
      drawerOpenByDiagram: {},
      saveRequestByDiagram: {},
    })
    renderHook(() => useEditorShortcuts("diagram-1"), { wrapper })

    press({ key: "s", code: "KeyS", ctrlKey: true, shiftKey: true })

    // The panel — not the shortcut — owns the editor and the save; the shortcut
    // just opens it and bumps the request the panel acts on.
    expect(useVersionStore.getState().drawerOpenByDiagram["diagram-1"]).toBe(
      true
    )
    expect(useVersionStore.getState().saveRequestByDiagram["diagram-1"]).toBe(1)
  })
})
