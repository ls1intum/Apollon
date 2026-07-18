import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  APOLLON_SHORTCUTS,
  ariaKeyshortcuts,
  handleShortcutKeydown,
  isElementInOverlay,
  matchesShortcutCombo,
  type KeyboardShortcutDeps,
} from "@/keyboard"

type EventInit = {
  key?: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  repeat?: boolean
  isComposing?: boolean
}

const ev = (init: EventInit) => ({
  key: init.key ?? "",
  code: init.code ?? "",
  ctrlKey: init.ctrlKey ?? false,
  metaKey: init.metaKey ?? false,
  shiftKey: init.shiftKey ?? false,
  altKey: init.altKey ?? false,
})

describe("APOLLON_SHORTCUTS", () => {
  it("gives every combo exactly one owner", () => {
    // Matching is first-hit-wins, so a combo listed twice makes the second
    // shortcut permanently dead with no error anywhere.
    const owners = new Map<string, string>()
    for (const shortcut of APOLLON_SHORTCUTS) {
      for (const combo of shortcut.combos) {
        const signature = JSON.stringify(combo)
        expect(
          owners.get(signature),
          `${signature} is claimed by both "${owners.get(signature)}" and "${shortcut.id}"`
        ).toBeUndefined()
        owners.set(signature, shortcut.id)
      }
    }
  })

  it("keeps printable-character combos behind a non-printable modifier", () => {
    // WCAG 2.1.4: an unmodified printable character fires from speech input.
    // Escape and the arrows are exempt (they print nothing).
    const nonPrintable = /^(Escape|Delete|Backspace|Arrow)/
    for (const shortcut of APOLLON_SHORTCUTS) {
      for (const combo of shortcut.combos) {
        if (combo.mod || combo.alt) continue
        expect(
          !!combo.key && nonPrintable.test(combo.key),
          `"${shortcut.id}" binds ${JSON.stringify(combo)} without Ctrl/Cmd/Alt`
        ).toBe(true)
      }
    }
  })
})

describe("matchesShortcutCombo", () => {
  it("takes Ctrl or Cmd for `mod`, and only the modifiers declared", () => {
    const copy = { key: "c", mod: true }

    expect(matchesShortcutCombo(ev({ key: "c", ctrlKey: true }), copy)).toBe(
      true
    )
    expect(matchesShortcutCombo(ev({ key: "C", metaKey: true }), copy)).toBe(
      true
    )
    expect(matchesShortcutCombo(ev({ key: "c" }), copy)).toBe(false)
    // An undeclared modifier is a different shortcut, never a looser match.
    expect(
      matchesShortcutCombo(
        ev({ key: "c", ctrlKey: true, shiftKey: true }),
        copy
      )
    ).toBe(false)
    expect(
      matchesShortcutCombo(ev({ key: "c", ctrlKey: true, altKey: true }), copy)
    ).toBe(false)
  })

  it("matches a `code` combo on the physical key, whatever the layout prints", () => {
    const fitView = { code: "Digit1", mod: true, shift: true }

    // QWERTY reports "!" for Shift+1; AZERTY reports "1".
    expect(
      matchesShortcutCombo(
        ev({ key: "!", code: "Digit1", ctrlKey: true, shiftKey: true }),
        fitView
      )
    ).toBe(true)
    expect(
      matchesShortcutCombo(
        ev({ key: "1", code: "Digit1", ctrlKey: true, shiftKey: true }),
        fitView
      )
    ).toBe(true)
    expect(
      matchesShortcutCombo(
        ev({ key: "1", code: "Digit1", ctrlKey: true }),
        fitView
      )
    ).toBe(false)
  })
})

describe("handleShortcutKeydown", () => {
  let actions: KeyboardShortcutDeps["actions"]
  let modifiable: boolean

  const dispatch = (
    init: EventInit,
    target: HTMLElement = document.body,
    beforeDispatch?: (event: KeyboardEvent) => void
  ) => {
    const event = new KeyboardEvent("keydown", {
      ...init,
      bubbles: true,
      cancelable: true,
    })
    beforeDispatch?.(event)
    // jsdom builds the event without a target until it is dispatched, so route
    // it through a real listener rather than calling the handler with a fake.
    const listener = (e: KeyboardEvent) =>
      handleShortcutKeydown(e, {
        actions,
        isDiagramModifiable: () => modifiable,
      })
    document.addEventListener("keydown", listener)
    target.dispatchEvent(event)
    document.removeEventListener("keydown", listener)
    return event
  }

  const mount = (html: string): HTMLElement => {
    document.body.innerHTML = html
    return document.body.firstElementChild as HTMLElement
  }

  beforeEach(() => {
    actions = {
      "select-all": vi.fn(),
      "clear-selection": vi.fn(),
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(),
      duplicate: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      "zoom-in": vi.fn(),
      "zoom-out": vi.fn(),
      "reset-zoom": vi.fn(),
      "fit-view": vi.fn(),
      "zoom-to-selection": vi.fn(),
    }
    modifiable = true
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("runs the matched action and claims the event", () => {
    // Unclaimed, Mod+D adds a bookmark and Mod+= zooms the browser page.
    expect(dispatch({ key: "d", ctrlKey: true }).defaultPrevented).toBe(true)
    expect(actions.duplicate).toHaveBeenCalledOnce()
  })

  it("leaves Delete, Backspace and the arrows to React Flow", () => {
    // A second delete path would race React Flow's own `deleteKeyCode`.
    for (const key of ["Delete", "Backspace", "ArrowUp"]) {
      expect(dispatch({ key }).defaultPrevented).toBe(false)
    }
    for (const action of Object.values(actions)) {
      expect(action).not.toHaveBeenCalled()
    }
  })

  it("ignores keys from text fields, from open overlays, and events already claimed", () => {
    for (const tag of ["input", "textarea", "select"]) {
      dispatch({ key: "a", ctrlKey: true }, mount(`<${tag}></${tag}>`))
    }
    dispatch({ key: "a", ctrlKey: true }, mount("<div contenteditable></div>"))

    for (const role of ["dialog", "menu", "listbox"]) {
      const overlay = mount(`<div role="${role}"><button></button></div>`)
      dispatch({ key: "a", ctrlKey: true }, overlay.querySelector("button")!)
    }
    expect(actions["select-all"]).not.toHaveBeenCalled()

    dispatch({ key: "z", ctrlKey: true }, document.body, (event) =>
      event.preventDefault()
    )
    expect(actions.undo).not.toHaveBeenCalled()

    // Mid-composition, an IME is still spelling a character out of these keys.
    dispatch({ key: "a", ctrlKey: true, isComposing: true })
    expect(actions["select-all"]).not.toHaveBeenCalled()
  })

  it("still answers an editor a host has mounted inside its own dialog", () => {
    // Only an overlay ON TOP of the canvas owns its keys; one that contains the
    // canvas is a host's modal, and the editor inside it must stay usable.
    const embedded = mount(
      '<div role="dialog"><div class="apollon-editor"><div id="canvas"></div></div></div>'
    )

    dispatch(
      { key: "a", ctrlKey: true },
      embedded.querySelector<HTMLElement>("#canvas")!
    )
    expect(actions["select-all"]).toHaveBeenCalledOnce()
  })

  it("holds a key down: repeats zoom, but duplicates only once", () => {
    // Auto-repeat fires ~30 keydowns/second; each duplicate is its own node and
    // its own undo step.
    dispatch({ key: "d", ctrlKey: true })
    dispatch({ key: "d", ctrlKey: true, repeat: true })
    expect(actions.duplicate).toHaveBeenCalledOnce()

    dispatch({ key: "-", ctrlKey: true })
    dispatch({ key: "-", ctrlKey: true, repeat: true })
    expect(actions["zoom-out"]).toHaveBeenCalledTimes(2)
  })

  it("read-only: editing shortcuts stay inert and unclaimed, view and copy stay live", () => {
    modifiable = false

    expect(dispatch({ key: "v", ctrlKey: true }).defaultPrevented).toBe(false)
    expect(actions.paste).not.toHaveBeenCalled()
    dispatch({ key: "z", ctrlKey: true })
    expect(actions.undo).not.toHaveBeenCalled()

    dispatch({ key: "c", ctrlKey: true })
    expect(actions.copy).toHaveBeenCalledOnce()
    dispatch({ key: "a", ctrlKey: true })
    expect(actions["select-all"]).toHaveBeenCalledOnce()
    expect(
      dispatch({ key: "0", code: "Digit0", ctrlKey: true }).defaultPrevented
    ).toBe(true)
    expect(actions["reset-zoom"]).toHaveBeenCalledOnce()
  })
})

describe("ariaKeyshortcuts", () => {
  it("names every alternative once, in a form that survives a split on '+'", () => {
    // Screen readers announce this verbatim, and "Control++" loses its key to
    // any consumer splitting on the delimiter.
    expect(ariaKeyshortcuts("undo")).toBe("Control+Z Meta+Z")
    expect(ariaKeyshortcuts("reset-zoom")).toBe(
      "Control+0 Meta+0 Control+Shift+0 Meta+Shift+0"
    )
    expect(ariaKeyshortcuts("zoom-in")).toBe(
      "Control+= Meta+= Control+Plus Meta+Plus Control+Shift+Plus Meta+Shift+Plus"
    )
    expect(ariaKeyshortcuts("fit-view")).toBe("Control+Shift+1 Meta+Shift+1")
  })
})

describe("isElementInOverlay", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const mount = (html: string) => {
    document.body.innerHTML = html
    return document.body
  }

  it("is true for an element inside a dialog or menu over the canvas", () => {
    for (const role of [
      "dialog",
      "alertdialog",
      "menu",
      "listbox",
      "combobox",
    ]) {
      const body = mount(`<div role="${role}"><button id="t"></button></div>`)
      expect(isElementInOverlay(body.querySelector("#t"))).toBe(true)
    }
  })

  it("is false for a plain canvas element and for null", () => {
    const body = mount(
      '<div class="apollon-editor"><div id="node"></div></div>'
    )
    expect(isElementInOverlay(body.querySelector("#node"))).toBe(false)
    expect(isElementInOverlay(null)).toBe(false)
  })

  it("is false when the overlay CONTAINS the editor (a host's own modal)", () => {
    // The editor embedded in a host dialog must stay usable — that dialog is the
    // host's chrome, not an overlay over the canvas.
    const body = mount(
      '<div role="dialog"><div class="apollon-editor"><div id="node"></div></div></div>'
    )
    expect(isElementInOverlay(body.querySelector("#node"))).toBe(false)
  })
})
