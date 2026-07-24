import { shortcutKeyName, type ApollonShortcutCombo } from "@tumaet/apollon"
import { isMacLike } from "./platform"

/**
 * The key caps for one platform. Display-only — the handlers take Ctrl or Cmd
 * either way. macOS prints ⌫ on the key that sends Backspace and ships no
 * Forward Delete on any laptop or Magic Keyboard, so ⌫ is the cap to show.
 */
export const keycaps = (isMac: boolean = isMacLike()) => ({
  isMac,
  mod: isMac ? "⌘" : "Ctrl",
  shift: isMac ? "⇧" : "Shift",
  alt: isMac ? "⌥" : "Alt",
  delete: isMac ? "⌫" : "Delete",
})

export type Keycaps = ReturnType<typeof keycaps>

/** Caps for the keys whose own name isn't what a keyboard prints on them. */
const keyCap = (key: string, caps: Keycaps): string =>
  ({
    Escape: "Esc",
    Delete: caps.delete,
    Backspace: caps.delete,
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  })[key] ?? key.toUpperCase()

/** A combo as key caps, outermost modifier first. */
export const formatCombo = (
  combo: ApollonShortcutCombo,
  caps: Keycaps
): string[] => {
  // Apple orders modifiers ⌥⇧⌘ — a platform convention, not a preference.
  const modifiers = caps.isMac
    ? [combo.alt && caps.alt, combo.shift && caps.shift, combo.mod && caps.mod]
    : [combo.mod && caps.mod, combo.alt && caps.alt, combo.shift && caps.shift]
  return [
    ...modifiers.filter((modifier) => typeof modifier === "string"),
    keyCap(shortcutKeyName(combo), caps),
  ]
}

/** A combo as one string, the way macOS (⌘S) and Windows (Ctrl+S) print it. */
export const formatComboText = (
  combo: ApollonShortcutCombo,
  caps: Keycaps = keycaps()
): string => formatCombo(combo, caps).join(caps.isMac ? "" : "+")
