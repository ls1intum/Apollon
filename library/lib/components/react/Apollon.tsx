import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { ApollonEditor } from "@/apollon-editor"
import type {
  ApollonCollaborationOptions,
  ApollonLabels,
  ApollonMode,
  ApollonOptions,
  ApollonView,
  UMLDiagramType,
  UMLModel,
} from "@/typings"
import { ApollonInstanceContext } from "./context"
import { ApollonPalette, ApollonZoom, ApollonMiniMap } from "./builtins"
import { ApollonSelectionToolbar } from "./ApollonSelectionToolbar"

/**
 * Props for the {@link Apollon} React component.
 *
 * - `default*` / `availableViews` / `enablePopups` / `collaborationEnabled` /
 *   `debug` are **snapshotted on mount** — re-key the component to apply
 *   changes against a new editor instance.
 * - `readonly` / `view` / `mode` / `scrollLock` / `previewMode` / `model`
 *   are **reactive** — applied via the matching `ApollonEditor` setter when
 *   the prop changes. Passing `undefined` leaves the live value untouched;
 *   re-key the component to fully reset.
 */
export interface ApollonProps {
  className?: string
  /** Inline styles. Needs an explicit non-zero height or the canvas renders blank. */
  style?: CSSProperties
  /**
   * Optional `--apollon-*` CSS custom properties spread onto the mount node's
   * `style`. Build one with `createApollonTheme(...)`. Fully optional — an
   * un-themed embed falls back to the library's built-in light/dark values.
   */
  theme?: Partial<Record<`--apollon-${string}`, string>>
  /**
   * Sets `data-theme` on the mount node. Optional — when omitted the editor
   * inherits whatever `data-theme` an ancestor declares, or the default light
   * values. See `library/THEMING.md`.
   */
  dataTheme?: "light" | "dark"
  /** Rendered inside the {@link ApollonInstanceContext} provider alongside the canvas. */
  children?: ReactNode

  // Initial-only options
  defaultModel?: UMLModel
  defaultType?: UMLDiagramType
  defaultMode?: ApollonMode
  defaultView?: ApollonView
  availableViews?: ApollonView[]
  enablePopups?: boolean
  collaborationEnabled?: boolean
  collaboration?: ApollonCollaborationOptions
  debug?: boolean

  // Reactive options
  readonly?: boolean
  view?: ApollonView
  mode?: ApollonMode
  scrollLock?: boolean
  /** Override the editor's own strings for i18n. See {@link ApollonEditor.setLabels}. */
  labels?: Partial<ApollonLabels>
  /** Local-only preview overlay. See {@link ApollonEditor.setPreviewMode}. */
  previewMode?: boolean
  /**
   * One-way reactive model push — each new value applies via
   * `editor.model = value`. NOT a two-way controlled value: the editor's own
   * edits are not mirrored back, and feeding `subscribeToModelChange` into this
   * prop loops. For save-on-change use `defaultModel` + an `onMount` subscription.
   */
  model?: UMLModel

  /**
   * Called once with the instance after mount. The optional returned function
   * runs as cleanup before destroy (React-19-style cleanup return).
   */
  onMount?: (editor: ApollonEditor) => void | (() => void)

  /**
   * Imperative handle to the underlying {@link ApollonEditor}. Assigned once
   * after mount and cleared on unmount.
   */
  ref?: Ref<ApollonEditor | null>
}

/** React wrapper around {@link ApollonEditor}. See `@tumaet/apollon` docs. */
export function Apollon(props: ApollonProps) {
  const {
    className,
    style,
    theme,
    dataTheme,
    children,

    defaultModel,
    defaultType,
    defaultMode,
    defaultView,
    availableViews,
    enablePopups,
    collaborationEnabled,
    collaboration,
    debug,

    readonly,
    view,
    mode,
    scrollLock,
    labels,
    previewMode,
    model,

    onMount,
    ref,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<ApollonEditor | null>(null)

  const initialOptionsRef = useRef<ApollonOptions>({
    model: defaultModel,
    type: defaultType,
    mode: defaultMode,
    view: defaultView,
    availableViews,
    enablePopups,
    collaborationEnabled,
    collaboration,
    debug,
    labels,
    // React always owns the chrome: the editor registers nothing, and `<Apollon>`
    // renders the default `<Apollon.*>` as fallback children when the consumer
    // composes none. That keeps composing-ness reactive — a control appearing or
    // disappearing is a normal mount/unmount — with a single owner per reserved id.
    controls: [],
  })

  // Commit-time write — StrictMode-safe latest-closure ref.
  const onMountRef = useRef(onMount)
  useEffect(() => {
    onMountRef.current = onMount
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const instance = new ApollonEditor(container, initialOptionsRef.current)

    // React-19 callback refs may return a cleanup function.
    let refCleanup: (() => void) | void
    if (typeof ref === "function") {
      const ret = ref(instance)
      if (typeof ret === "function") refCleanup = ret
    } else if (ref) {
      ;(ref as RefObject<ApollonEditor | null>).current = instance
    }

    setEditor(instance)
    const userCleanup = onMountRef.current?.(instance)

    return () => {
      // Order: user cleanup → destroy → null ref. A destroyed instance
      // briefly visible through the ref is more honest than a still-running
      // editor that a sibling layout effect could touch.
      if (typeof userCleanup === "function") userCleanup()
      instance.destroy()

      setEditor(null)
      if (refCleanup) {
        refCleanup()
      } else if (typeof ref === "function") {
        ref(null)
      } else if (ref) {
        ;(ref as RefObject<ApollonEditor | null>).current = null
      }
    }
    // Initial-only — re-key the component to rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reactive props. `!== undefined` so `false` propagates; passing
  // `undefined` leaves the live value alone (does NOT reset to default).
  useEffect(() => {
    if (editor && readonly !== undefined) editor.setReadonly(readonly)
  }, [editor, readonly])

  useEffect(() => {
    if (editor && scrollLock !== undefined) editor.setScrollLock(scrollLock)
  }, [editor, scrollLock])

  useEffect(() => {
    if (editor && labels !== undefined) editor.setLabels(labels)
  }, [editor, labels])

  useEffect(() => {
    if (editor && previewMode !== undefined) editor.setPreviewMode(previewMode)
  }, [editor, previewMode])

  useEffect(() => {
    // `editor.view`/`editor.model` are the editor's public imperative setters
    // (accessor properties, no method form). Assigning them in an effect is the
    // API contract, not a React-state mutation — the compiler still optimizes.
    // eslint-disable-next-line react-hooks/immutability
    if (editor && view !== undefined) editor.view = view
  }, [editor, view])

  useEffect(() => {
    if (editor && mode !== undefined) editor.setMode(mode)
  }, [editor, mode])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (editor && model !== undefined) editor.model = model
  }, [editor, model])

  // Theme tokens are spread last so an explicit `style` can't shadow a
  // caller-provided `--apollon-*` override.
  const mergedStyle: CSSProperties = { ...style, ...theme }

  return (
    <ApollonInstanceContext.Provider value={editor}>
      <div
        ref={containerRef}
        className={className}
        style={mergedStyle}
        data-theme={dataTheme}
      />
      {children ?? <DefaultChildren />}
    </ApollonInstanceContext.Provider>
  )
}

/** The editor's default chrome, composed for the no-children case. Rendering
 *  these (vs. the consumer's own children) is what "omitting children keeps the
 *  defaults" means — and each is a normal, reactively-mounted control. */
function DefaultChildren() {
  return (
    <>
      <ApollonPalette />
      <ApollonZoom />
      <ApollonMiniMap />
    </>
  )
}

/**
 * Compound built-in chrome, so consumers compose `<Apollon.Palette/>`,
 * `<Apollon.Zoom/>`, `<Apollon.MiniMap/>` as children — presence renders, omission
 * hides, typed props reconfigure. Custom controls / replacements use the bare
 * `<ApollonControl>` (or `useControl`) at a reserved id. Also exported by name.
 */
Apollon.Palette = ApollonPalette
Apollon.Zoom = ApollonZoom
Apollon.MiniMap = ApollonMiniMap
Apollon.SelectionToolbar = ApollonSelectionToolbar
