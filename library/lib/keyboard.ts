/**
 * Every key the editor consumes, and how a keydown is matched and dispatched.
 * `APOLLON_SHORTCUTS` is public so a host can render a shortcut sheet, or check
 * the list before binding a key of its own.
 */

interface ApollonShortcutModifiers {
  /** Ctrl on Windows/Linux, Cmd on macOS. */
  readonly mod?: boolean
  readonly shift?: boolean
  readonly alt?: boolean
}

/**
 * A combo matches either the layout-aware `KeyboardEvent.key`, case-insensitively
 * — so Mod+Z follows the key the user's layout prints — or the physical
 * `KeyboardEvent.code`, for keys whose character moves under Shift or across
 * layouts (every digit: French AZERTY prints "à" where QWERTY prints "0").
 */
export type ApollonShortcutCombo = ApollonShortcutModifiers &
  (
    | { readonly key: string; readonly code?: never }
    | { readonly code: string; readonly key?: never }
  )

export type ApollonShortcutId =
  | "select-all"
  | "clear-selection"
  | "delete"
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "move-selection"
  | "undo"
  | "redo"
  | "zoom-in"
  | "zoom-out"
  | "reset-zoom"
  | "fit-view"
  | "zoom-to-selection"

/** The ids React Flow implements; the rest run on the editor's own handler. */
type CanvasHandledId = "delete" | "move-selection"

type HandledShortcutId = Exclude<ApollonShortcutId, CanvasHandledId>

interface ApollonShortcutBase {
  /** Alternatives; any triggers the shortcut. The first is the primary — the one a shortcut sheet shows. */
  readonly combos: readonly [ApollonShortcutCombo, ...ApollonShortcutCombo[]]
  /** Inert while the diagram is read-only. */
  readonly requiresModifiable: boolean
}

export type ApollonShortcut =
  | (ApollonShortcutBase & {
      readonly id: HandledShortcutId
      readonly canvasHandled?: never
    })
  | (ApollonShortcutBase & {
      readonly id: CanvasHandledId
      /** React Flow's own (`deleteKeyCode`, keyboard node moving). Listed so a
       *  host sees every consumed key; skipped by the editor's handler. */
      readonly canvasHandled: true
    })

/**
 * Conventions follow the mainstream canvas tools, except that zoom-to-fit and
 * zoom-to-selection take a Mod where Figma/Excalidraw/tldraw use a bare
 * Shift+1/Shift+2 — see the WCAG 2.1.4 note in `docs/library/api.md`.
 */
export const APOLLON_SHORTCUTS: readonly ApollonShortcut[] = [
  {
    id: "select-all",
    combos: [{ key: "a", mod: true }],
    requiresModifiable: false,
  },
  {
    id: "clear-selection",
    combos: [{ key: "Escape" }],
    requiresModifiable: false,
  },

  {
    id: "delete",
    combos: [{ key: "Delete" }, { key: "Backspace" }],
    requiresModifiable: true,
    canvasHandled: true,
  },
  { id: "copy", combos: [{ key: "c", mod: true }], requiresModifiable: false },
  { id: "cut", combos: [{ key: "x", mod: true }], requiresModifiable: true },
  { id: "paste", combos: [{ key: "v", mod: true }], requiresModifiable: true },
  {
    id: "duplicate",
    combos: [{ key: "d", mod: true }],
    requiresModifiable: true,
  },
  {
    id: "move-selection",
    combos: [
      { key: "ArrowUp" },
      { key: "ArrowDown" },
      { key: "ArrowLeft" },
      { key: "ArrowRight" },
    ],
    requiresModifiable: true,
    canvasHandled: true,
  },

  { id: "undo", combos: [{ key: "z", mod: true }], requiresModifiable: true },
  {
    id: "redo",
    combos: [
      { key: "z", mod: true, shift: true },
      { key: "y", mod: true },
    ],
    requiresModifiable: true,
  },

  {
    id: "zoom-in",
    // "+" is unshifted on QWERTZ, Shift+"=" on QWERTY, and its own numpad key.
    combos: [
      { key: "=", mod: true },
      { key: "+", mod: true },
      { key: "+", mod: true, shift: true },
    ],
    requiresModifiable: false,
  },
  {
    id: "zoom-out",
    combos: [
      { key: "-", mod: true },
      { key: "_", mod: true, shift: true },
    ],
    requiresModifiable: false,
  },
  {
    id: "reset-zoom",
    combos: [
      { code: "Digit0", mod: true },
      { code: "Digit0", mod: true, shift: true },
      { code: "Numpad0", mod: true },
    ],
    requiresModifiable: false,
  },
  {
    id: "fit-view",
    combos: [{ code: "Digit1", mod: true, shift: true }],
    requiresModifiable: false,
  },
  {
    id: "zoom-to-selection",
    combos: [{ code: "Digit2", mod: true, shift: true }],
    requiresModifiable: false,
  },
]

/**
 * Every modifier must be exactly as declared, so Mod+Shift+C never falls
 * through to copy. `mod` accepts Ctrl or Cmd on every platform.
 */
export function matchesShortcutCombo(
  event: Pick<
    KeyboardEvent,
    "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
  >,
  combo: ApollonShortcutCombo
): boolean {
  if (!!combo.mod !== (event.ctrlKey || event.metaKey)) return false
  if (!!combo.shift !== event.shiftKey) return false
  if (!!combo.alt !== event.altKey) return false
  return combo.code !== undefined
    ? event.code === combo.code
    : combo.key.toLowerCase() === event.key.toLowerCase()
}

/**
 * The key a combo names: its `KeyboardEvent.key`, or its physical `code` with
 * the layout prefix stripped ("KeyH" -> "H"). A host rendering a shortcut sheet
 * maps this to its own key caps.
 */
export function shortcutKeyName(combo: ApollonShortcutCombo): string {
  return combo.key ?? combo.code.replace(/^(Key|Digit|Numpad)/, "")
}

/** "Control++" loses its key to a split on "+"; the other keys survive one. */
const ARIA_KEY_NAMES: Record<string, string> = { "+": "Plus" }

/**
 * A shortcut as an `aria-keyshortcuts` value: modifiers first joined by "+",
 * alternatives separated by spaces (`"Control+Z Meta+Z"`). `mod` expands to
 * Control and Meta, since either fires it.
 */
export function ariaKeyshortcuts(id: ApollonShortcutId): string {
  const shortcut = APOLLON_SHORTCUTS.find((entry) => entry.id === id)!
  const combos = shortcut.combos.flatMap((combo) => {
    const raw = shortcutKeyName(combo)
    const tail = [
      ...(combo.alt ? ["Alt"] : []),
      ...(combo.shift ? ["Shift"] : []),
      ARIA_KEY_NAMES[raw] ?? (raw.length === 1 ? raw.toUpperCase() : raw),
    ]
    return combo.mod
      ? [["Control", ...tail].join("+"), ["Meta", ...tail].join("+")]
      : [tail.join("+")]
  })
  // Layout aliases collapse onto one name (Digit0 and Numpad0 are both "0").
  return [...new Set(combos)].join(" ")
}

const TYPING_TAGS = ["INPUT", "SELECT", "TEXTAREA"]

/**
 * Whether the event comes from a surface the user is typing into. Mirrors React
 * Flow's internal `isInputDOMNode` — which its public entry doesn't export — so
 * the editor's shortcuts and React Flow's agree on what counts as typing,
 * including its `.nokey` opt-out and its retargeting-safe `composedPath()`.
 */
export function isTypingTarget(event: KeyboardEvent): boolean {
  const target = (event.composedPath?.()[0] ?? event.target) as Element | null
  if (target?.nodeType !== 1) return false
  return (
    TYPING_TAGS.includes(target.nodeName) ||
    target.hasAttribute("contenteditable") ||
    !!target.closest(".nokey")
  )
}

const OVERLAY_ROLES =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"]'

/**
 * Whether the event comes from a widget that owns its own key handling while
 * open — a dialog, a menu, a select. An overlay that *contains* an editor is a
 * host mounting the canvas inside its own dialog, which owns nothing; only an
 * overlay over the canvas counts. Exported alongside `isTypingTarget` so a
 * host's shortcuts can stand down on the same surfaces the editor's do.
 */
export function isInsideOverlay(event: KeyboardEvent): boolean {
  const target = (event.composedPath?.()[0] ?? event.target) as Element | null
  if (target?.nodeType !== 1) return false
  const overlay = target.closest(OVERLAY_ROLES)
  return !!overlay && !overlay.querySelector(".apollon-editor")
}

/** Auto-repeat is an accelerator for these; every other shortcut fires once per press. */
const REPEATABLE: ReadonlySet<HandledShortcutId> = new Set([
  "undo",
  "redo",
  "zoom-in",
  "zoom-out",
])

export interface KeyboardShortcutDeps {
  /** An action returns `false` when it had nothing to do, which leaves the key to the browser. */
  actions: Record<HandledShortcutId, () => boolean | void>
  isDiagramModifiable: () => boolean
}

/**
 * Runs `APOLLON_SHORTCUTS` against one keydown. An action that runs claims its
 * key — without that, Mod+= / Mod+- / Mod+0 zoom the browser page instead.
 */
export function handleShortcutKeydown(
  event: KeyboardEvent,
  { actions, isDiagramModifiable }: KeyboardShortcutDeps
): void {
  if (event.defaultPrevented) return
  // Mid-composition, an IME is still spelling a character out of these keys.
  if (event.isComposing) return
  if (isTypingTarget(event)) return
  if (isInsideOverlay(event)) return

  for (const shortcut of APOLLON_SHORTCUTS) {
    if (!shortcut.combos.some((combo) => matchesShortcutCombo(event, combo))) {
      continue
    }
    if (shortcut.canvasHandled) return
    if (shortcut.requiresModifiable && !isDiagramModifiable()) return
    if (event.repeat && !REPEATABLE.has(shortcut.id)) {
      // Claimed but not repeated: a held Mod+D must not reach "add bookmark".
      event.preventDefault()
      return
    }
    if (actions[shortcut.id]() !== false) event.preventDefault()
    return
  }
}
