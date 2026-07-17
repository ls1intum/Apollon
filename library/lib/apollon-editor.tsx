import ReactDOM from "react-dom/client"
import type { CSSProperties } from "react"
// Must be imported FIRST (before ./utils, the stores and overlay modules) so the
// editor render tree — and the node/edge component registries it pulls in —
// evaluates ahead of any utility/store/overlay module. Relocating it (e.g.
// behind a store factory or a separate root module) reorders the bundle and
// reintroduces a load-order TDZ in the node/popover registries.
import { AppWithProvider } from "./App"
import { ReactFlowInstance, type Node, type Edge } from "@xyflow/react"
import {
  parseDiagramType,
  mapFromReactFlowNodeToApollonNode,
  mapFromReactFlowEdgeToApollonEdge,
  filterRenderedElements,
  getSVG,
  getRenderedDiagramBounds,
  getElementIdsByTag,
  resolveTagConfig,
  applyElementTags,
} from "./utils"
// Internal (not re-exported through the public `./utils` barrel): brings any
// incoming model onto the current schema (e.g. legacy class stereotypes) at
// every hydration boundary, since editor load does NOT route through the public
// `importDiagram`.
import { normalizeModel } from "./utils/versionConverter"
import { UMLDiagramType } from "./types"
import { createDiagramStore, type DiagramStore } from "@/store/diagramStore"
import { createMetadataStore, type MetadataStore } from "@/store/metadataStore"
import { createPopoverStore, type PopoverStore } from "@/store/popoverStore"
import {
  createAssessmentSelectionStore,
  type AssessmentSelectionStore,
} from "@/store/assessmentSelectionStore"
import { createAlignmentGuidesStore } from "@/store/alignmentGuidesStore"
import { createEdgeGeometryStore } from "@/store/edgeGeometryStore"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  PopoverStoreContext,
  AssessmentSelectionStoreContext,
  AlignmentGuidesStoreContext,
  EdgeGeometryStoreContext,
  OverlayStoreContext,
} from "./store/context"
import { createOverlayStore, type OverlayStore } from "./overlay/overlayStore"
import {
  assertBuiltInControlRegion,
  preserveBuiltInControlKind,
  defaultControls,
} from "./chrome/builtins/controls"
import { mergeLabels } from "./i18n/labels"
import { insetAwareFitView } from "./overlay/fitView"
import { RegionMount } from "./overlay/RegionMount"
import {
  type InsetContribution,
  type OverlayControlInput,
  type OverlayControlSnapshot,
  type OverlayRegion,
  type OverlaySide,
  OVERLAY_REGIONS,
  ZERO_INSETS,
} from "./overlay/types"
import { getPerfCounters } from "./sync/perfCounters"
import { MessageType, SendBroadcastMessage, YjsSync } from "./sync/yjsSync"
import { getNodesMap } from "./sync/ydoc"
import * as Y from "yjs"
import { StoreApi } from "zustand"
import * as Apollon from "./typings"
import { FONT_FAMILY, DEFAULT_FONT_SIZE } from "./fontStack"

const normalizeCollaborationOptions = (options?: Apollon.ApollonOptions) => {
  const collaboration = options?.collaboration
  const enabled =
    collaboration?.enabled ??
    options?.collaborationEnabled ??
    Boolean(collaboration?.user)
  const showVisualsByDefault = enabled && Boolean(collaboration?.user)

  return {
    enabled,
    user: collaboration?.user,
    showPresence: collaboration?.showPresence ?? showVisualsByDefault,
    showCursors: collaboration?.showCursors ?? showVisualsByDefault,
    showSelectionHighlights:
      collaboration?.showSelectionHighlights ?? showVisualsByDefault,
    showFollow: collaboration?.showFollow ?? showVisualsByDefault,
  }
}

const disabledCollaboration = {
  enabled: false,
  showPresence: false,
  showCursors: false,
  showSelectionHighlights: false,
  showFollow: false,
}

function cloneInsetSnapshot(
  inset: InsetContribution | undefined
): InsetContribution | undefined {
  if (inset === undefined || inset === "auto") return inset
  return Object.freeze({ ...inset })
}

function cloneStyleSnapshot(
  style: CSSProperties | undefined
): CSSProperties | undefined {
  return style ? Object.freeze({ ...style }) : undefined
}

const noopCollaborationAwareness = {
  setLocalAwarenessCursor: () => {},
  setLocalAwarenessSelectedElement: () => {},
  setLocalAwarenessViewport: () => {},
  setLocalAwarenessFollowing: () => {},
  getAwarenessStates: () => new Map(),
  subscribeToAwarenessChanges: () => () => {},
  subscribeToCollaboratorChanges: () => () => {},
  getLocalAwarenessClientId: () => 0,
}

export class ApollonEditor {
  private root: ReactDOM.Root
  private reactFlowInstance: ReactFlowInstance | null = null
  private readonly syncManager: YjsSync
  private readonly ydoc: Y.Doc
  private readonly diagramStore: StoreApi<DiagramStore>
  private readonly metadataStore: StoreApi<MetadataStore>
  private readonly popoverStore: StoreApi<PopoverStore>
  private readonly assessmentSelectionStore: StoreApi<AssessmentSelectionStore>
  private readonly overlayStore: StoreApi<OverlayStore>
  private readonly hostRegionEls = new Map<OverlayRegion, HTMLElement>()
  private readonly controlGenerations = new Map<string, number>()
  private subscribers: Apollon.Subscribers = {}
  constructor(element: HTMLElement, options?: Apollon.ApollonOptions) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Element is required to initialize Apollon")
    }

    // Theming: spread `--apollon-*` overrides onto the mount node and respect
    // an incoming `data-theme`. Both optional — un-themed mounts keep the
    // element's existing attributes / inherited values and the built-in
    // light/dark fallbacks. Only sets the keys provided.
    if (options?.theme) {
      for (const [key, value] of Object.entries(options.theme)) {
        if (value !== undefined) element.style.setProperty(key, value)
      }
    }
    if (options?.dataTheme !== undefined) {
      element.setAttribute("data-theme", options.dataTheme)
    }

    this.ydoc = new Y.Doc()
    this.diagramStore = createDiagramStore(this.ydoc)
    this.metadataStore = createMetadataStore(
      this.ydoc,
      () => this.diagramStore.getState().previewMode
    )
    this.popoverStore = createPopoverStore()
    this.assessmentSelectionStore = createAssessmentSelectionStore()
    const alignmentGuidesStore = createAlignmentGuidesStore()
    const edgeGeometryStore = createEdgeGeometryStore()
    this.overlayStore = createOverlayStore()
    this.syncManager = new YjsSync(
      this.ydoc,
      this.diagramStore,
      this.metadataStore
    )
    const collaboration = normalizeCollaborationOptions(options)
    if (collaboration.enabled && collaboration.user) {
      this.syncManager.setLocalAwarenessState({
        user: collaboration.user,
        selectedElementId: null,
      })
    }

    const diagramId =
      options?.model?.id || Math.random().toString(36).substring(2, 15)

    this.root = ReactDOM.createRoot(element, {
      identifierPrefix: `apollon-${diagramId}`,
    })

    this.diagramStore.getState().setDiagramId(diagramId)

    // Keep an empty title EMPTY — don't force "Untitled Diagram" (which would be
    // written back to the model and persisted). Hosts show their own placeholder.
    const diagramName = options?.model?.title ?? ""
    const diagramType =
      options?.type || options?.model?.type || UMLDiagramType.ClassDiagram
    this.metadataStore
      .getState()
      .updateMetaData(diagramName, parseDiagramType(diagramType))

    if (options?.model) {
      const model = normalizeModel(options.model)
      const nodes = model.nodes || []
      const edges = model.edges || []
      const assessments = model.assessments || {}
      this.diagramStore.getState().setNodesAndEdges(nodes, edges)
      this.diagramStore.getState().setAssessments(assessments)
      this.diagramStore.getState().setInteractive(model.interactive)
    }

    if (options?.mode) {
      this.metadataStore.getState().setMode(options.mode)
    }
    if (options?.view) {
      this.metadataStore.getState().setView(options.view)
    }
    const availableViews = options?.availableViews
      ? Array.from(
          new Set([
            Apollon.ApollonView.Modelling,
            ...options.availableViews,
            ...(options.view ? [options.view] : []),
          ])
        )
      : options?.view === Apollon.ApollonView.Highlight
        ? [Apollon.ApollonView.Modelling, Apollon.ApollonView.Highlight]
        : undefined
    if (availableViews) {
      this.metadataStore.getState().setAvailableViews(availableViews)
    }
    if (options?.enablePopups !== undefined) {
      this.popoverStore.getState().setPopupEnabled(options.enablePopups)
    }
    if (options?.readonly !== undefined) {
      this.metadataStore.getState().setReadonly(options.readonly)
    }
    if (options?.debug !== undefined) {
      this.metadataStore.getState().setDebug(options.debug)
    }
    if (options?.scrollLock !== undefined) {
      this.metadataStore.getState().setScrollLock(options.scrollLock)
    }
    if (options?.keyboardShortcuts !== undefined) {
      this.metadataStore
        .getState()
        .setKeyboardShortcuts(options.keyboardShortcuts)
    }
    if (options?.labels !== undefined) {
      this.metadataStore.getState().setLabels(mergeLabels(options.labels))
    }
    if (options?.tags !== undefined) {
      this.metadataStore.getState().setTagConfig(resolveTagConfig(options.tags))
    }
    // Register the chrome: the given descriptors (even `[]`, an explicit bare
    // canvas), or the palette + zoom + minimap defaults when omitted. The React
    // `<Apollon>` wrapper always passes `[]` and instead composes its own defaults
    // as fallback children, so composing-ness stays fully reactive (no mount-time
    // snapshot, no default fighting a composed control over a reserved id).
    for (const control of options?.controls ?? defaultControls())
      this.addControl(control)

    this.diagramStore.getState().setCollaborationEnabled(collaboration.enabled)

    // Undo/redo runs in modelling, collaboration included. The UndoManager
    // tracks only locally-authored ("store") writes, so each peer undoes only
    // their own edits (local undo). Safe because transient drag/resize frames
    // are no longer persisted (see diagramStore.onNodesChange).
    if (this.metadataStore.getState().mode === Apollon.ApollonMode.Modelling) {
      this.diagramStore.getState().initializeUndoManager()
    }

    this.root.render(
      <DiagramStoreContext.Provider value={this.diagramStore}>
        <MetadataStoreContext.Provider value={this.metadataStore}>
          <PopoverStoreContext.Provider value={this.popoverStore}>
            <AssessmentSelectionStoreContext.Provider
              value={this.assessmentSelectionStore}
            >
              <AlignmentGuidesStoreContext.Provider
                value={alignmentGuidesStore}
              >
                <EdgeGeometryStoreContext.Provider value={edgeGeometryStore}>
                  <OverlayStoreContext.Provider value={this.overlayStore}>
                    <AppWithProvider
                      onReactFlowInit={this.setReactFlowInstance.bind(this)}
                      collaboration={collaboration}
                      awareness={{
                        setLocalAwarenessCursor:
                          this.syncManager.setLocalAwarenessCursor,
                        setLocalAwarenessSelectedElement:
                          this.syncManager.setLocalAwarenessSelectedElement,
                        setLocalAwarenessViewport:
                          this.syncManager.setLocalAwarenessViewport,
                        setLocalAwarenessFollowing:
                          this.syncManager.setLocalAwarenessFollowing,
                        getAwarenessStates: this.syncManager.getAwarenessStates,
                        subscribeToAwarenessChanges:
                          this.syncManager.subscribeToAwarenessChanges,
                        subscribeToCollaboratorChanges:
                          this.syncManager.subscribeToCollaboratorChanges,
                        getLocalAwarenessClientId:
                          this.syncManager.getLocalAwarenessClientId,
                      }}
                    />
                  </OverlayStoreContext.Provider>
                </EdgeGeometryStoreContext.Provider>
              </AlignmentGuidesStoreContext.Provider>
            </AssessmentSelectionStoreContext.Provider>
          </PopoverStoreContext.Provider>
        </MetadataStoreContext.Provider>
      </DiagramStoreContext.Provider>
    )
  }

  private setReactFlowInstance(instance: ReactFlowInstance) {
    this.reactFlowInstance = instance
  }

  public getNodes(): Node[] {
    if (this.reactFlowInstance) {
      return this.reactFlowInstance.getNodes()
    }
    return []
  }

  public getEdges(): Edge[] {
    return this.reactFlowInstance ? this.reactFlowInstance.getEdges() : []
  }

  public getViewport(): { x: number; y: number; zoom: number } | null {
    if (!this.reactFlowInstance) {
      return null
    }
    return this.reactFlowInstance.getViewport()
  }

  public screenToFlowPosition(position: { x: number; y: number }) {
    if (!this.reactFlowInstance) {
      return null
    }
    return this.reactFlowInstance.screenToFlowPosition(position, {
      snapToGrid: false,
    })
  }

  public flowToScreenPosition(position: { x: number; y: number }) {
    if (!this.reactFlowInstance) {
      return null
    }
    return this.reactFlowInstance.flowToScreenPosition(position)
  }

  /**
   * Zoom/pan so the whole diagram fits, capped at `maxZoom: 1.0`. Retries up to
   * 10 animation frames until every node is measured.
   * @param options.padding - Scalar fraction (default `0.15`), or per-side px
   *   that adds to a 16px gutter. A per-side object forces the inset-aware path.
   * @param options.duration - Animation duration in ms (default `200`).
   * @param options.respectInsets - Pad the fit by reserved overlay insets
   *   (header, rails, …). Default `true`. The device safe area (notch, home
   *   indicator) is always cleared — it is a hardware constraint, not chrome.
   */
  public fitView(options?: {
    padding?: number | Partial<Record<OverlaySide, number>>
    duration?: number
    /** Pad the fit by the reserved overlay insets (header, rails, …). */
    respectInsets?: boolean
  }): void {
    const duration = options?.duration ?? 200
    const respectInsets = options?.respectInsets ?? true
    const explicit = options?.padding
    const maxAttempts = 10
    let attempts = 0

    const attempt = () => {
      attempts++
      const rf = this.reactFlowInstance
      if (!rf) return
      const rfNodes = rf.getNodes()
      const expected = this.diagramStore.getState().nodes.length
      // fitView on an empty canvas stays queued until nodes exist, then fires
      // on the first one and jerks the viewport. No-op when there's nothing to
      // frame.
      if (expected === 0) return
      const allMeasured =
        rfNodes.length >= expected &&
        rfNodes.every(
          (n) =>
            (n.measured?.width ?? n.width ?? 0) > 0 &&
            (n.measured?.height ?? n.height ?? 0) > 0
        )
      if (allMeasured || attempts >= maxAttempts) {
        const overlay = this.overlayStore.getState()
        const insets = respectInsets ? overlay.insets : ZERO_INSETS
        insetAwareFitView(rf, insets, overlay.safeArea, {
          padding: explicit,
          duration,
        })
        return
      }
      // Nodes aren't measured yet — re-queue so the fit lands once React Flow
      // has sized them, instead of framing an unmeasured (empty-bounds) graph.
      requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
  }

  // ---- Canvas overlay / control API -------------------------------------
  // A library-owned overlay engine: host chrome (header, rails, banners) and the
  // editor's own overlays share one measured, inset-aware layout. Controls
  // render INSIDE the React Flow context. `getRegionElement` is the escape hatch
  // for hosts that need their OWN React context (theme, router) via createPortal.

  /**
   * Register a floating control, returning a disposer. Re-using an id replaces
   * (idempotent / StrictMode-safe). Pick a façade: a React host →
   * `<ApollonControl>`; a non-React host (or one that needs its own React
   * root/context) → `getRegionElement` + `createPortal`; a one-off imperative
   * widget → `addControl`.
   * @param control - id, target region, a `render` thunk, and optional layout
   *   options ({@link OverlayControlInput}).
   * @returns A disposer that unregisters this control; safe to call twice.
   * @throws If `id` is empty or `region` is not a known region — mistakes fail
   *   loudly at the edge, not silently in the renderer.
   */
  public addControl(control: OverlayControlInput): () => void {
    if (!control.id)
      throw new Error("[ApollonEditor] addControl: id must be non-empty")
    if (!OVERLAY_REGIONS.includes(control.region))
      throw new Error(
        `[ApollonEditor] addControl: unknown region: ${control.region}`
      )
    const generation = (this.controlGenerations.get(control.id) ?? 0) + 1
    this.controlGenerations.set(control.id, generation)
    this.overlayStore.getState().register(control)
    return () => {
      if (this.controlGenerations.get(control.id) !== generation) return
      this.overlayStore.getState().unregister(control.id)
      this.controlGenerations.delete(control.id)
    }
  }

  /**
   * Patch a registered control's options/renderer (a no-op if absent).
   * @param id - The control's immutable id (an `id` in `patch` is ignored).
   * @param patch - Partial options/renderer merged over the existing control.
   */
  public updateControl(id: string, patch: Partial<OverlayControlInput>): void {
    const existing = this.overlayStore.getState().controls[id]
    if (!existing) return
    if (patch.region !== undefined && !OVERLAY_REGIONS.includes(patch.region))
      throw new Error(
        `[ApollonEditor] updateControl: unknown region: ${patch.region}`
      )
    // Pin id last so a stray `patch.id` can't fork the control under a new key.
    const next = { ...existing, ...patch, id }
    // Built-in descriptors carry a private renderer-kind marker so their own
    // runtime updates stay within the regions their renderers support. Replacing
    // the renderer intentionally drops that marker: a host control at PALETTE_ID /
    // MINIMAP_ID is a normal control and can move to any valid region.
    if (patch.render === undefined) preserveBuiltInControlKind(existing, next)
    if (patch.region !== undefined)
      assertBuiltInControlRegion(next, patch.region)
    this.overlayStore.getState().register(next)
  }

  /**
   * Unregister a control by id (a no-op if absent). Hides a built-in imperatively
   * — e.g. `editor.removeControl(ZOOM_ID)` — the parity for omitting it from a
   * React composition. Equivalent to the disposer `addControl` returns.
   * @param id - The control's id.
   */
  public removeControl(id: string): void {
    this.controlGenerations.delete(id)
    this.overlayStore.getState().unregister(id)
  }

  /**
   * @param id - A control id.
   * @returns `true` if a control with this id is currently registered.
   */
  public hasControl(id: string): boolean {
    return id in this.overlayStore.getState().controls
  }

  /**
   * @param id - A control id.
   * @returns The registered control options, or `undefined` if absent — e.g. to
   *   read a built-in's current `region` after `updateControl`. The renderer is
   *   intentionally omitted; replace a renderer explicitly with `updateControl`.
   */
  public getControl(id: string): OverlayControlSnapshot | undefined {
    const control = this.overlayStore.getState().controls[id]
    if (!control) return undefined
    return Object.freeze({
      id: control.id,
      region: control.region,
      inset: cloneInsetSnapshot(control.inset),
      order: control.order,
      lane: control.lane,
      interactive: control.interactive,
      groupLabel: control.groupLabel,
      visible: control.visible,
      className: control.className,
      style: cloneStyleSnapshot(control.style),
    })
  }

  /**
   * A stable DOM node anchored in `region`, for hosts that render their own
   * React into it (via `createPortal`) to keep host context. Auto-measured, so
   * the diagram makes room for whatever the host mounts. Lifetime = the editor;
   * `releaseRegionElement` unregisters it. Reserved id: `apollon:host:<region>`.
   * @param region - The region to anchor the node in.
   * @returns The same node for the lifetime of one acquire; `releaseRegionElement`
   *   drops it and the next call returns a fresh node.
   * @throws If `region` is not a known region.
   */
  public getRegionElement(region: OverlayRegion): HTMLElement {
    if (!OVERLAY_REGIONS.includes(region))
      throw new Error(
        `[ApollonEditor] getRegionElement: unknown region: ${region}`
      )
    let el = this.hostRegionEls.get(region)
    if (el) return el
    // Create + register once. `releaseRegionElement` drops the node from the
    // cache, so a reopen re-enters here and re-registers — no need to re-register
    // (and clobber host-applied options) on a plain re-read.
    el = document.createElement("div")
    this.hostRegionEls.set(region, el)
    const node = el
    this.overlayStore.getState().register({
      id: `apollon:host:${region}`,
      region,
      inset: "auto",
      // The host mount is a pass-through frame: the host paints its own chrome
      // (header islands, rail panels) which re-opt into pointer events via their
      // own `pointer-events: auto`. Without this, ControlSlot would wrap the whole
      // region (e.g. the full-width header band) in a pointer-events:auto +
      // nopan/nodrag/nowheel div, turning the transparent gaps between islands
      // into a dead zone that swallows canvas drag/pan.
      interactive: false,
      render: () => <RegionMount el={node} />,
    })
    return el
  }

  /**
   * Release a region acquired via {@link getRegionElement} (unregister + drop
   * the cached node); a later `getRegionElement(region)` creates a fresh node.
   * @param region - The region whose host node to release.
   */
  public releaseRegionElement(region: OverlayRegion): void {
    this.overlayStore.getState().unregister(`apollon:host:${region}`)
    this.hostRegionEls.delete(region)
  }

  set diagramType(type: UMLDiagramType) {
    this.metadataStore.getState().updateDiagramType(type)
    this.diagramStore.getState().setNodesAndEdges([], [])
    this.diagramStore.getState().setAssessments({})
  }

  public destroy() {
    try {
      Object.keys(this.subscribers).forEach((subscriberId) => {
        this.subscribers[parseInt(subscriberId)]?.()
      })
      this.subscribers = {}

      this.syncManager.stopSync()
      this.root.unmount()
      this.ydoc.destroy()
      this.hostRegionEls.clear()
      this.controlGenerations.clear()
      this.reactFlowInstance = null
    } catch (err) {
      // destroy() is best-effort — partial teardown is acceptable, but log
      // so a regression in unmount/ydoc.destroy is surfaced rather than hidden.
      // eslint-disable-next-line no-console
      console.warn("[ApollonEditor] destroy() partial failure:", err)
    }
  }

  /** Renders a model to SVG via a hidden, off-screen mount. */
  static async exportModelAsSvg(
    model: Apollon.UMLModel,
    options?: Apollon.ExportOptions
  ): Promise<Apollon.SVG> {
    // Off-screen render path bypasses the constructor, so normalize here too
    // (in place) — otherwise a legacy model exports with the old stereotypes.
    normalizeModel(model)
    const container = document.createElement("div")
    container.style.display = "flex"
    container.style.width = "4000px"
    container.style.height = "4000px"
    container.style.zIndex = "-1000"
    container.style.top = "0"
    container.style.position = "absolute"
    container.style.left = "-99px"
    container.style.visibility = "hidden"

    document.body.appendChild(container)

    // Self-contained styling: inject the layout CSS + Inter `@font-face` the
    // headless mount needs so a consumer rendering in a browser never has to
    // import "@tumaet/apollon/style.css". The load-bearing rule is React Flow's
    // `.react-flow__node { position: absolute }`; without it the handle `%`
    // offsets resolve against a zero-size box, on-mount handle measurement is
    // wrong, and edges route through the node boxes. The `@font-face` pins
    // canvas `measureText` to Inter so wrap decisions match the editor.
    //
    // Into <head>, not `container`: React's createRoot owns `container` and
    // clears its children on first render, so a container-scoped <style> would
    // be discarded before it applies. Removed in the `finally` below. Inert
    // under jsdom (no layout engine), so the server export stays byte-stable.
    let exportStyleEl: HTMLStyleElement | undefined
    try {
      const [{ EXPORT_LAYOUT_CSS }, { INTER_FONT_FACE_CSS }] =
        await Promise.all([
          import("./utils/exportStyles"),
          import("./utils/exportFonts"),
        ])
      exportStyleEl = document.createElement("style")
      exportStyleEl.setAttribute("data-apollon-export-styles", "")
      exportStyleEl.textContent = `${EXPORT_LAYOUT_CSS}\n${INTER_FONT_FACE_CSS}`
      document.head.appendChild(exportStyleEl)
    } catch {
      // Best-effort: missing CSS only degrades fidelity, never aborts export.
    }

    const ydoc = new Y.Doc()
    // Construct-only: no undo manager, no collaboration — keeps the headless
    // render deterministic (no `initializeUndoManager` + the no-op awareness
    // below). Overlay store exists but no controls are registered, so the
    // overlay layer renders nothing and insets stay zero.
    const diagramStore = createDiagramStore(ydoc)
    const metadataStore = createMetadataStore(
      ydoc,
      () => diagramStore.getState().previewMode
    )
    const popoverStore = createPopoverStore()
    const assessmentSelectionStore = createAssessmentSelectionStore()
    const alignmentGuidesStore = createAlignmentGuidesStore()
    const edgeGeometryStore = createEdgeGeometryStore()
    const overlayStore = createOverlayStore()
    const diagramId = Math.random().toString(36).substring(2, 15)

    let setReactFlowInstance: (instance: ReactFlowInstance) => void = () => {}

    const reactFlowInstancePromise = new Promise<ReactFlowInstance>(
      (resolve) => {
        setReactFlowInstance = resolve
      }
    )

    const svgRoot = ReactDOM.createRoot(container, {
      identifierPrefix: `apollon-exportAsSVG-${diagramId}`,
    })

    // Single teardown for every exit path (success or throw), run once from the
    // `finally` below: drop the injected <head> styles, unmount React, detach
    // the off-screen container, and dispose the Yjs doc. Each step is
    // idempotent so it is safe even if mounting never completed.
    const teardown = () => {
      exportStyleEl?.remove()
      svgRoot.unmount()
      container.remove()
      ydoc.destroy()
    }

    try {
      diagramStore.getState().setNodesAndEdges(model.nodes, model.edges)
      diagramStore.getState().setAssessments(model.assessments)

      svgRoot.render(
        <DiagramStoreContext.Provider value={diagramStore}>
          <MetadataStoreContext.Provider value={metadataStore}>
            <PopoverStoreContext.Provider value={popoverStore}>
              <AssessmentSelectionStoreContext.Provider
                value={assessmentSelectionStore}
              >
                <AlignmentGuidesStoreContext.Provider
                  value={alignmentGuidesStore}
                >
                  <EdgeGeometryStoreContext.Provider value={edgeGeometryStore}>
                    <OverlayStoreContext.Provider value={overlayStore}>
                      <AppWithProvider
                        onReactFlowInit={setReactFlowInstance}
                        collaboration={disabledCollaboration}
                        awareness={noopCollaborationAwareness}
                      />
                    </OverlayStoreContext.Provider>
                  </EdgeGeometryStoreContext.Provider>
                </AlignmentGuidesStoreContext.Provider>
              </AssessmentSelectionStoreContext.Provider>
            </PopoverStoreContext.Provider>
          </MetadataStoreContext.Provider>
        </DiagramStoreContext.Provider>
      )

      // Race ReactFlow init against a 3 s timeout so a hung mount can't deadlock export.
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000)
      })

      const reactFlowInstance = await Promise.race([
        reactFlowInstancePromise,
        timeoutPromise,
      ])

      if (!reactFlowInstance) {
        throw new Error("React Flow instance not initialized")
      }

      // Wait for webfonts to load before we measure: canvas text measurement
      // (used by the wrap layout) otherwise falls back to the generic-family
      // metrics and the exported SVG's wrap decisions would drift from the
      // on-screen render. Explicitly load each Inter face — `document.fonts.ready`
      // alone would not wait for an injected `@font-face` until a glyph requests
      // it — then await `ready` for any other pending faces. The italic faces
      // back abstract classes/methods; omitting them would measure/render that
      // text in a fallback family. Best-effort throughout (older browsers / jsdom
      // may lack `document.fonts`).
      if (typeof document !== "undefined" && document.fonts) {
        if (document.fonts.load) {
          const size = DEFAULT_FONT_SIZE
          await Promise.all([
            document.fonts.load(`400 ${size}px ${FONT_FAMILY}`),
            document.fonts.load(`700 ${size}px ${FONT_FAMILY}`),
            document.fonts.load(`italic 400 ${size}px ${FONT_FAMILY}`),
            document.fonts.load(`italic 700 ${size}px ${FONT_FAMILY}`),
          ]).catch(() => {})
        }
        if (document.fonts.ready) {
          await document.fonts.ready.catch(() => {})
        }
      }

      // Wait for ReactFlow to fully lay out nodes and measure custom handle
      // positions (especially for non-rectangular shapes like parallelograms).
      // setTimeout lets ResizeObserver callbacks fire; double-rAF ensures paint.
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        }, 150)
      })

      filterRenderedElements(container, options)

      const bounds = getRenderedDiagramBounds(reactFlowInstance, container)

      const margin = 60
      const clip = {
        x: bounds.x - margin,
        y: bounds.y - margin,
        width: bounds.width + margin * 2,
        height: bounds.height + margin * 2,
      }

      // Compat exports embed Inter as a base64 @font-face, loaded lazily so the
      // font stays out of the main bundle (see exportFonts.ts).
      let fontFaceCss: string | undefined
      if (options?.svgMode === "compat") {
        try {
          fontFaceCss = (await import("./utils/exportFonts"))
            .INTER_FONT_FACE_CSS
        } catch {
          // Best-effort: a failed font-chunk load must not abort the export
          // (the SVG still names the Inter family).
          fontFaceCss = undefined
        }
      }

      const svgString = getSVG(container, clip, options, fontFaceCss)

      return { svg: svgString, clip }
    } finally {
      teardown()
    }
  }

  /**
   * exports current model as svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   */
  exportAsSVG(options?: Apollon.ExportOptions): Promise<Apollon.SVG> {
    return ApollonEditor.exportModelAsSvg(this.model, options)
  }

  private getNewSubscriptionId(): number {
    const subscribers = this.subscribers
    // largest key + 1
    if (Object.keys(subscribers).length === 0) return 0
    return Math.max(...Object.keys(subscribers).map((key) => parseInt(key))) + 1
  }

  public subscribeToModelChange(
    callback: (state: Apollon.UMLModel) => void
  ): number {
    const subscriberId = this.getNewSubscriptionId()
    const unsubscribeCallback = this.diagramStore.subscribe(() =>
      callback(this.model)
    )
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public subscribeToDiagramNameChange(
    callback: (diagramTitle: string) => void
  ) {
    const subscriberId = this.getNewSubscriptionId()
    const unsubscribeCallback = this.metadataStore.subscribe((state) =>
      callback(state.diagramTitle)
    )
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public subscribeToAssessmentSelection(
    callback: (selectedElementIds: string[]) => void
  ) {
    const subscriberId = this.getNewSubscriptionId()
    const unsubscribeCallback = this.assessmentSelectionStore.subscribe(
      (state) => callback(state.selectedElementIds)
    )
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public subscribeToSelectionChange(
    callback: (selectedElementIds: string[]) => void
  ) {
    const subscriberId = this.getNewSubscriptionId()
    let prev = this.diagramStore.getState().selectedElementIds
    const unsubscribeCallback = this.diagramStore.subscribe((state) => {
      const next = state.selectedElementIds
      if (next !== prev) {
        prev = next
        callback(next)
      }
    })
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public subscribeToAwarenessChanges(
    callback: (states: Map<number, Apollon.CollaborationState>) => void
  ) {
    const subscriberId = this.getNewSubscriptionId()
    const unsubscribeCallback =
      this.syncManager.subscribeToAwarenessChanges(callback)
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public subscribeToCollaboratorChanges(
    callback: (collaborators: Apollon.CollaboratorInfo[]) => void
  ) {
    const subscriberId = this.getNewSubscriptionId()
    const unsubscribeCallback =
      this.syncManager.subscribeToCollaboratorChanges(callback)
    this.subscribers[subscriberId] = unsubscribeCallback
    return subscriberId
  }

  public unsubscribe(subscriberId: number) {
    const unsubscribeCallback = this.subscribers[subscriberId]
    if (unsubscribeCallback) {
      unsubscribeCallback()
      delete this.subscribers[subscriberId]
    }
  }

  public sendBroadcastMessage(sendFn: SendBroadcastMessage) {
    this.syncManager.setSendBroadcastMessage(sendFn)
  }

  public receiveBroadcastedMessage(base64Data: string) {
    this.syncManager.handleReceivedData(base64Data)
  }

  /**
   * Push the entire local Yjs document to peers. Hosts should call this on
   * every (re)connect so any edits made while the transport was closed are
   * absorbed by the room. See `YjsSync.broadcastFullState`.
   */
  public broadcastFullState() {
    this.syncManager.broadcastFullState()
  }

  public setLocalAwarenessUser(user: Apollon.CollaborationUser) {
    this.syncManager.setLocalAwarenessUser(user)
  }

  public setLocalAwarenessCursor(cursor: Apollon.CollaborationCursor | null) {
    this.syncManager.setLocalAwarenessCursor(cursor)
  }

  public setLocalAwarenessSelectedElement(selectedElementId: string | null) {
    this.syncManager.setLocalAwarenessSelectedElement(selectedElementId)
  }

  public setLocalAwarenessState(state: Partial<Apollon.CollaborationState>) {
    this.syncManager.setLocalAwarenessState(state)
  }

  public getLocalAwarenessClientId(): number {
    return this.syncManager.getLocalAwarenessClientId()
  }

  public getCollaborators(): Apollon.CollaboratorInfo[] {
    return this.syncManager.getCollaborators()
  }

  public updateDiagramTitle(name: string) {
    this.metadataStore.getState().updateDiagramTitle(name)
  }

  /**
   * Toggles the editor's read-only state at runtime. Used by hosting apps
   * to lock the canvas while previewing an immutable snapshot (e.g. the
   * version-history preview), without tearing down and re-mounting the
   * editor instance.
   */
  public setReadonly(readonly: boolean): void {
    this.metadataStore.getState().setReadonly(readonly)
    if (readonly) {
      // Selection ring + popover are interactive affordances; drop them
      // so they don't survive the lock as inert UI on uneditable elements.
      this.diagramStore.getState().setSelectedElementsId([])
      this.popoverStore.getState().setPopOverElementId(null)
    }
  }

  /** Live-toggle modeling vs assessment vs exporting mode. */
  public setMode(mode: Apollon.ApollonMode): void {
    this.metadataStore.getState().setMode(mode)
  }

  /** Live-toggle whether the canvas captures page scroll. */
  public setScrollLock(scrollLock: boolean): void {
    this.metadataStore.getState().setScrollLock(scrollLock)
  }

  /**
   * Replace the editor's user-facing strings (i18n). Merged over the English
   * defaults, so a partial map only changes the keys it provides. Reactive — the
   * chrome re-renders, so a host can switch language without remounting.
   * @param labels - A partial {@link ApollonLabels} in the host's language.
   */
  public setLabels(labels: Partial<Apollon.ApollonLabels>): void {
    this.metadataStore.getState().setLabels(mergeLabels(labels))
  }

  /**
   * Turn element-tag authoring on or off, and configure it. `true` enables
   * free-form tagging; an object supplies a fixed `available` vocabulary and/or
   * toggles `allowCreate`; `false`/`undefined` disables the authoring UI.
   * Reactive. Tags already on the model stay queryable either way — this gates
   * only the UI.
   * @param options - `true`, a {@link TagOptions} object, or falsy to disable.
   */
  public setTags(options?: boolean | Apollon.TagOptions): void {
    this.metadataStore.getState().setTagConfig(resolveTagConfig(options))
  }

  /**
   * Set the tags on one element (a node, or a class attribute/method) by id, for
   * hosts that assign tags programmatically instead of through the editor UI.
   * Replaces the element's tag list; pass `[]` to clear. Unknown ids are ignored.
   */
  public setElementTags(elementId: string, tags: string[]): void {
    const { nodes, setNodes } = this.diagramStore.getState()
    const next = applyElementTags(nodes, elementId, tags)
    if (next !== nodes) setNodes(next)
  }

  /**
   * Toggle preview-overlay mode. When `true`, subsequent `model = …`
   * assignments and other store mutators update the local Zustand caches
   * (so the canvas displays the overlay) WITHOUT writing to the Yjs
   * doc — leaving the collaborative document untouched. Yjs observers
   * also stop propagating peer-driven updates to Zustand, so the overlay
   * doesn't flicker as collaborators edit the live diagram.
   *
   * On flip-off the local Zustand state is rebuilt from the (now
   * peer-augmented) Yjs maps so the canvas catches up to everything
   * collaborators committed during the preview.
   *
   * Hosts should call `setPreviewMode(true)` before applying a preview
   * model and `setPreviewMode(false)` on exit. The Yjs doc never needs
   * to be "restored" from a snapshot because it was never disturbed.
   */
  public setPreviewMode(active: boolean): void {
    this.diagramStore.getState().setPreviewMode(active)
    // The diagram store handles nodes/edges/assessments resync on
    // flip-off; metadata lives in a separate store, so resync the
    // diagram title/type from Yjs here so a peer rename during preview
    // is visible the moment the user exits.
    if (!active) {
      this.metadataStore.getState().updateMetaDataFromYjs()
    }
  }

  public toggleInteractiveElementsMode(forceEnabled?: boolean): void {
    const currentView = this.metadataStore.getState().view
    const shouldEnable =
      forceEnabled ?? currentView !== Apollon.ApollonView.Highlight

    this.metadataStore
      .getState()
      .setView(
        shouldEnable
          ? Apollon.ApollonView.Highlight
          : Apollon.ApollonView.Modelling
      )
  }

  public getInteractiveForSerialization():
    | Apollon.InteractiveElements
    | undefined {
    return this.diagramStore.getState().getInteractiveForSerialization()
  }

  public getDiagramMetadata() {
    const { diagramTitle, diagramType } = this.metadataStore.getState()
    return { diagramTitle, diagramType }
  }

  get model(): Apollon.UMLModel {
    const { nodes, edges, diagramId } = this.diagramStore.getState()
    const { diagramTitle, diagramType } = this.metadataStore.getState()
    const interactive = this.getInteractiveForSerialization()
    return {
      id: diagramId,
      version: "4.1.0",
      title: diagramTitle,
      type: diagramType,
      nodes: nodes.map((node) => mapFromReactFlowNodeToApollonNode(node)),
      edges: edges.map((edge) => mapFromReactFlowEdgeToApollonEdge(edge)),
      assessments: this.diagramStore.getState().assessments,
      ...(interactive && { interactive }),
    }
  }

  set model(incoming: Apollon.UMLModel) {
    const model = normalizeModel(incoming)
    const { nodes, edges, assessments, interactive } = model
    // Every store action below routes its Yjs writes through the
    // shared `transactStore` helper that no-ops in preview mode, so
    // the assignment is safe whether or not preview is active.
    this.diagramStore.getState().setNodesAndEdges(nodes, edges)
    this.diagramStore.getState().setAssessments(assessments)
    this.diagramStore.getState().setInteractive(interactive)
    this.metadataStore
      .getState()
      .updateMetaData(model.title, parseDiagramType(model.type))
  }

  /**
   * Host-driven element highlighting. Paints a translucent overlay over each
   * given node / edge / class-member id in the supplied CSS color. Typical
   * hosts: an assessment editor marking elements that are missing feedback, or
   * Athena marking elements that have automatic-feedback suggestions.
   *
   * The highlight is an ephemeral view overlay: it is NOT written into the
   * model, NOT serialized by `get model`, and NOT shared with collaborators.
   * Each call replaces the previous highlight set; pass `null` (or an empty
   * map) to clear all highlights. Passing `undefined` is a no-op.
   *
   * @param highlights map / record of element id -> CSS color (any valid CSS
   *   color string, e.g. `"rgba(23,162,184,0.3)"`), or `null` to clear.
   */
  public setElementHighlights(
    highlights: Map<string, string> | Record<string, string> | null | undefined
  ): void {
    if (highlights === undefined) return
    const record =
      highlights === null
        ? {}
        : Object.fromEntries(
            highlights instanceof Map ? highlights : Object.entries(highlights)
          )
    this.assessmentSelectionStore.getState().setElementHighlights(record)
  }

  /** Returns a copy of the current highlight record (id -> CSS color). */
  public getElementHighlights(): Record<string, string> {
    return { ...this.assessmentSelectionStore.getState().highlightedElements }
  }

  /**
   * Ids of every element carrying the given host-defined tag — a node, or one
   * of its members (a class attribute or method, an SFC action row). See the
   * `tags` field on element data. Matching is
   * exact and case-sensitive, apart from surrounding whitespace, which is
   * trimmed from both the query and stored tags; an unknown or blank tag yields
   * an empty array. Returns a snapshot in document order — re-query after a
   * model change.
   *
   * Pair it with {@link ApollonEditor.setElementHighlights} to color a whole
   * group by a host-computed status without touching the saved model.
   *
   * @example
   * const ids = editor.getElementIdsByTag("testAttributes[Context]")
   * editor.setElementHighlights(Object.fromEntries(ids.map((id) => [id, "red"])))
   */
  public getElementIdsByTag(tag: string): string[] {
    return getElementIdsByTag(this.diagramStore.getState().nodes, tag)
  }

  public getSelectedElements(): string[] {
    const { mode, readonly } = this.metadataStore.getState()
    if (mode === Apollon.ApollonMode.Assessment && readonly) {
      return this.assessmentSelectionStore.getState().selectedElementIds
    }
    return this.diagramStore.getState().selectedElementIds
  }

  get view(): Apollon.ApollonView {
    return this.metadataStore.getState().view
  }

  set view(view: Apollon.ApollonView) {
    this.metadataStore.getState().setView(view)
  }

  public addOrUpdateAssessment(assessment: Apollon.Assessment): void {
    this.diagramStore.getState().addOrUpdateAssessment(assessment)
  }

  /**
   * Dev/test-only performance probe; returns `undefined` in production.
   * @internal — not part of the public API; stripped from the published d.ts.
   */
  public __perf():
    | {
        encodedDocBytes: number
        nodesMapSize: number
        storeNodeWrites: number
      }
    | undefined {
    if (!import.meta.env.DEV && import.meta.env.VITE_E2E !== "true")
      return undefined

    const counters = getPerfCounters()

    return {
      encodedDocBytes: Y.encodeStateAsUpdate(this.ydoc).byteLength,
      nodesMapSize: getNodesMap(this.ydoc).size,
      storeNodeWrites: counters?.storeNodeWrites ?? 0,
    }
  }

  static generateInitialSyncMessage(): string {
    return YjsSync.uint8ToBase64(new Uint8Array([MessageType.YjsSYNC]))
  }

  static generateInitialAwarenessSyncMessage(): string {
    return YjsSync.uint8ToBase64(new Uint8Array([MessageType.AwarenessSync]))
  }
}
