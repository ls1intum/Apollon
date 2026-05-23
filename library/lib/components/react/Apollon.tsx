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
  ApollonMode,
  ApollonOptions,
  ApollonView,
  Locale,
  UMLDiagramType,
  UMLModel,
} from "@/typings"
import { ApollonInstanceContext } from "./context"

/**
 * Props for the {@link Apollon} React component.
 *
 * The prop surface deliberately splits into two layers:
 *
 * - **Initial-only props** (`default*`, `availableViews`, `enablePopups`,
 *   `collaborationEnabled`, `locale`, `debug`) are snapshotted when the
 *   editor mounts and silently ignored if they change afterwards — they
 *   touch construction-time wiring (undo manager, Yjs init, stores).
 *   Re-key the component to apply them to a new editor instance.
 *
 * - **Reactive props** (`readonly`, `view`, `mode`, `scrollLock`,
 *   `previewMode`, `model`) are applied via the matching `ApollonEditor`
 *   setter when they change. No rebuild.
 */
export interface ApollonProps {
  // ─── Container ────────────────────────────────────────────────────────
  className?: string
  /**
   * Inline styles for the editor's container.
   *
   * The container needs an explicit, non-zero height — e.g. `{ height: 600 }`,
   * or `{ height: "100%" }` when every ancestor is also sized — or the canvas
   * renders blank.
   */
  style?: CSSProperties
  /**
   * Children rendered inside the {@link ApollonInstanceContext} provider
   * alongside the editor's canvas. Use this for toolbars, overlays, and any
   * descendant that wants to call {@link useApollonEditor}.
   */
  children?: ReactNode

  // ─── Initial-only options (snapshotted on mount) ──────────────────────
  /** Initial diagram model. Subsequent updates go through the editor
   *  instance (or via the controlled `model` prop). */
  defaultModel?: UMLModel
  /** Initial diagram type when `defaultModel` is absent. */
  defaultType?: UMLDiagramType
  /** Initial mode. Modelling / Assessment / Exporting. */
  defaultMode?: ApollonMode
  /** Initial view. */
  defaultView?: ApollonView
  /** Views the user may switch between at runtime. */
  availableViews?: ApollonView[]
  /** Whether inline edit/property popovers are enabled. */
  enablePopups?: boolean
  /** Opt into Yjs real-time sync. Wire the transport via `onMount`. */
  collaborationEnabled?: boolean
  /** Locale (currently a no-op — the editor renders in English). */
  locale?: Locale
  /** Enable debug overlays/logging. */
  debug?: boolean

  // ─── Reactive options (applied via setters when the prop changes) ────
  /** Live-toggle read-only without rebuilding the editor. */
  readonly?: boolean
  /** Live-toggle view. */
  view?: ApollonView
  /** Live-toggle mode. */
  mode?: ApollonMode
  /** Prevent the canvas from capturing page scroll. */
  scrollLock?: boolean
  /**
   * Live-toggle preview-overlay mode. While `true`, model changes update
   * the local view without writing to the Yjs doc — designed for version-
   * history previews. See {@link ApollonEditor.setPreviewMode}.
   */
  previewMode?: boolean
  /**
   * Controlled-model overlay. When defined, every change replaces the
   * editor's model via `editor.model = value`. Designed for preview /
   * version-history hosts; leave it `undefined` to drive the model
   * imperatively through the editor instance.
   */
  model?: UMLModel

  // ─── Lifecycle callbacks ─────────────────────────────────────────────
  /**
   * Called once with the editor instance, right after construction.
   * The optional returned function runs as a cleanup right before the
   * editor is destroyed (React-19-style cleanup return).
   *
   * Identity-stability is NOT required: only the latest closure runs.
   */
  onMount?: (editor: ApollonEditor) => void | (() => void)
  /**
   * Called once with the editor instance, right before destruction.
   * Last chance to read editor state.
   */
  onBeforeDestroy?: (editor: ApollonEditor) => void
}

/**
 * Apollon as a React component.
 *
 * Owns the editor's lifecycle — constructs the editor on mount and
 * destroys it on unmount. The imperative {@link ApollonEditor} instance is
 * reachable three ways:
 *
 *   1. a `ref` to the instance (React-18 `forwardRef`, React-19 ref-as-prop),
 *   2. an `onMount(editor)` callback (Monaco / tldraw idiom), and
 *   3. {@link useApollonEditor} from any descendant.
 *
 * ```tsx
 * import { Apollon } from "@tumaet/apollon/react"
 * import "@tumaet/apollon/style.css"
 *
 * <Apollon style={{ height: 600 }} />
 * ```
 *
 * Import it from the `@tumaet/apollon/react` subpath so the editor shares
 * your host's React copy — the default `@tumaet/apollon` entry bundles a
 * second React.
 */
export const Apollon = forwardRef<ApollonEditor | null, ApollonProps>(
  function Apollon(props, ref) {
    const {
      className,
      style,
      children,

      defaultModel,
      defaultType,
      defaultMode,
      defaultView,
      availableViews,
      enablePopups,
      collaborationEnabled,
      locale,
      debug,

      readonly,
      view,
      mode,
      scrollLock,
      previewMode,
      model,

      onMount,
      onBeforeDestroy,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [editor, setEditor] = useState<ApollonEditor | null>(null)

    // Snapshot the initial-only options — touched by the constructor and
    // not reactive afterwards. `useRef`'s initializer is evaluated once and
    // the discard on later renders is the price of pinning to first-render
    // values. Reactive props are deliberately NOT seeded here: the dedicated
    // effects below are the single source of truth for `readonly`, `view`,
    // `mode`, `scrollLock`, `previewMode`, and `model`.
    const initialOptionsRef = useRef<ApollonOptions>({
      model: defaultModel,
      type: defaultType,
      mode: defaultMode,
      view: defaultView,
      availableViews,
      enablePopups,
      collaborationEnabled,
      locale,
      debug,
    })

    // Keep the latest lifecycle closures reachable from the mount cleanup
    // without making them effect deps. Writing refs in an effect (not in
    // render) honours the react.dev `useRef` pitfall — a discarded render
    // under concurrent mode never advances the captured closure.
    const onMountRef = useRef(onMount)
    const onBeforeDestroyRef = useRef(onBeforeDestroy)
    useEffect(() => {
      onMountRef.current = onMount
      onBeforeDestroyRef.current = onBeforeDestroy
    })

    useEffect(() => {
      const container = containerRef.current
      if (!container) {
        // React's commit phase attaches the container before child effects
        // run, so this should be unreachable; flag it loudly if it isn't.
        // eslint-disable-next-line no-console
        console.error(
          "<Apollon> mount effect ran with no container ref — editor not constructed."
        )
        return
      }

      const instance = new ApollonEditor(container, initialOptionsRef.current)

      // Publish to the consumer ref. React-19 callback refs may return a
      // cleanup function; capture it for the unmount path. Object refs use
      // the legacy assign-now-null-later pattern.
      let refCleanup: (() => void) | void
      if (typeof ref === "function") {
        const ret = ref(instance)
        if (typeof ret === "function") refCleanup = ret
      } else if (ref) {
        ;(ref as MutableRefObject<ApollonEditor | null>).current = instance
      }

      // Publish to context so descendants can `useApollonEditor()`.
      setEditor(instance)

      // Hand the instance to the host; capture any cleanup it returns.
      const userCleanup = onMountRef.current?.(instance)

      return () => {
        // Run consumer cleanups while the editor is still alive — they
        // may want to call `editor.X()` one last time.
        if (typeof userCleanup === "function") userCleanup()
        onBeforeDestroyRef.current?.(instance)

        // Destroy before clearing the ref/context: the brief window where
        // ref still points at a destroyed instance is more honest than
        // ref=null + a still-running editor a layout effect could touch.
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
      // The editor is built exactly once per mount. Re-key the component
      // to rebuild against different initial options.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ─── Reactive prop effects ────────────────────────────────────────
    // Each reactive prop has its own effect so unrelated changes don't
    // cascade through the editor's transient state. All bail out when the
    // editor hasn't mounted yet.
    //
    // Guard uniformly with `!== undefined` so `false` propagates correctly
    // and removing a prop resets the corresponding state to its default.

    useEffect(() => {
      if (editor && readonly !== undefined) editor.setReadonly(readonly)
    }, [editor, readonly])

    useEffect(() => {
      if (editor && scrollLock !== undefined) editor.setScrollLock(scrollLock)
    }, [editor, scrollLock])

    useEffect(() => {
      if (editor && previewMode !== undefined) {
        editor.setPreviewMode(previewMode)
      }
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

    return (
      <ApollonInstanceContext.Provider value={editor}>
        <div ref={containerRef} className={className} style={style} />
        {children}
      </ApollonInstanceContext.Provider>
    )
  }
)
