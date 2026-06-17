import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react"
import { ApollonEditor } from "@/apollon-editor"
import type {
  ApollonCollaborationOptions,
  ApollonMode,
  ApollonOptions,
  ApollonView,
  UMLDiagramType,
  UMLModel,
} from "@/typings"
import { ApollonInstanceContext } from "./context"

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
  theme?: Record<string, string>
  /**
   * Sets `data-theme` on the mount node (e.g. `"dark"`). Optional — when
   * omitted the editor inherits whatever `data-theme` an ancestor declares,
   * or the default light values. See `library/THEMING.md`.
   */
  dataTheme?: string
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
  /** Local-only preview overlay. See {@link ApollonEditor.setPreviewMode}. */
  previewMode?: boolean
  /** Controlled-model overlay — every change applies via `editor.model = value`. */
  model?: UMLModel

  /**
   * Called once with the instance after mount. The optional returned function
   * runs as cleanup before destroy (React-19-style cleanup return).
   */
  onMount?: (editor: ApollonEditor) => void | (() => void)
}

/** React wrapper around {@link ApollonEditor}. See `@tumaet/apollon/react` docs. */
export const Apollon = forwardRef<ApollonEditor | null, ApollonProps>(
  function Apollon(props, ref) {
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
      previewMode,
      model,

      onMount,
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
        ;(ref as MutableRefObject<ApollonEditor | null>).current = instance
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
          ;(ref as MutableRefObject<ApollonEditor | null>).current = null
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
      if (editor && previewMode !== undefined)
        editor.setPreviewMode(previewMode)
    }, [editor, previewMode])

    useEffect(() => {
      if (editor && view !== undefined) editor.view = view
    }, [editor, view])

    useEffect(() => {
      if (editor && mode !== undefined) editor.setMode(mode)
    }, [editor, mode])

    useEffect(() => {
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
        {children}
      </ApollonInstanceContext.Provider>
    )
  }
)
