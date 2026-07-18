import { describe, expect, it } from "vitest"
import { APOLLON_SHORTCUTS } from "@tumaet/apollon"
import { EDITOR_SHORTCUTS } from "@/hooks/useEditorShortcuts"
import { formatCombo, formatComboText, keycaps } from "./shortcutCaps"

const everyCombo = [
  ...APOLLON_SHORTCUTS.flatMap((shortcut) => shortcut.combos),
  ...EDITOR_SHORTCUTS.map((shortcut) => shortcut.combo),
]

describe("formatCombo", () => {
  it("renders a real key cap for every combo either registry binds", () => {
    // A combo matched on `code` carries a layout prefix the user never sees:
    // unstripped, ⌥⇧H reads "Alt+Shift+KEYH" on the shortcut sheet.
    for (const caps of [keycaps(true), keycaps(false)]) {
      for (const combo of everyCombo) {
        const [key] = formatCombo(combo, caps).slice(-1)
        expect(key, JSON.stringify(combo)).not.toMatch(/^(Key|Digit|Numpad)/i)
        expect(key.length, JSON.stringify(combo)).toBeLessThanOrEqual(9)
      }
    }
  })

  it("orders modifiers the way each platform prints them", () => {
    const redo = { key: "z", mod: true, shift: true } as const

    expect(formatCombo(redo, keycaps(true))).toEqual(["⇧", "⌘", "Z"])
    expect(formatCombo(redo, keycaps(false))).toEqual(["Ctrl", "Shift", "Z"])
    // macOS has no Forward Delete key to name.
    expect(formatCombo({ key: "Delete" }, keycaps(true))).toEqual(["⌫"])
  })
})

describe("formatComboText", () => {
  it("joins caps the way the platform writes them", () => {
    const save = { key: "s", mod: true } as const

    expect(formatComboText(save, keycaps(true))).toBe("⌘S")
    expect(formatComboText(save, keycaps(false))).toBe("Ctrl+S")
  })
})
