import ReactDOM from "react-dom/client"
import { AppWithProvider } from "./App"
import { ReactFlowInstance, type Node, type Edge } from "@xyflow/react"
import {
  parseDiagramType,
  mapFromReactFlowNodeToApollonNode,
  mapFromReactFlowEdgeToApollonEdge,
  DeepPartial,
  filterRenderedElements,
  getSVG,
  getRenderedDiagramBounds,
} from "./utils"
import { UMLDiagramType } from "./types"
import { createDiagramStore, DiagramStore } from "@/store/diagramStore"
import { createMetadataStore, MetadataStore } from "@/store/metadataStore"
import { createPopoverStore, PopoverStore } from "@/store/popoverStore"
import {
  createAssessmentSelectionStore,
  AssessmentSelectionStore,
} from "@/store/assessmentSelectionStore"
import {
  createAlignmentGuidesStore,
  AlignmentGuidesStore,
} from "@/store/alignmentGuidesStore"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  PopoverStoreContext,
  AssessmentSelectionStoreContext,
  AlignmentGuidesStoreContext,
} from "./store/context"
import {
  MessageType,
  SendBroadcastMessage,
  YjsSyncClass,
} from "./sync/yjsSyncClass"
import * as Y from "yjs"
import { StoreApi } from "zustand"
import * as Apollon from "./typings"

export class ApollonEditor {
  private root: ReactDOM.Root
  private reactFlowInstance: ReactFlowInstance | null = null
  private readonly syncManager: YjsSyncClass
  private readonly ydoc: Y.Doc
  private readonly diagramStore: StoreApi<DiagramStore>
  private readonly metadataStore: StoreApi<MetadataStore>
  private readonly popoverStore: StoreApi<PopoverStore>
  private readonly assessmentSelectionStore: StoreApi<AssessmentSelectionStore>
  private readonly alignmentGuidesStore: StoreApi<AlignmentGuidesStore>
  private subscribers: Apollon.Subscribers = {}
  constructor(element: HTMLElement, options?: Apollon.ApollonOptions) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Element is required to initialize Apollon")
    }

    this.ydoc = new Y.Doc()
    this.diagramStore = createDiagramStore(this.ydoc)
    this.metadataStore = createMetadataStore(
      this.ydoc,
      () => this.diagramStore.getState().previewMode
    )
    this.popoverStore = createPopoverStore()
    this.assessmentSelectionStore = createAssessmentSelectionStore()
    this.alignmentGuidesStore = createAlignmentGuidesStore()
    this.syncManager = new YjsSyncClass(
      this.ydoc,
      this.diagramStore,
      this.metadataStore
    )

    const diagramId =
      options?.model?.id || Math.random().toString(36).substring(2, 15)

    // Initialize React root
    this.root = ReactDOM.createRoot(element, {
      identifierPrefix: `apollon-${diagramId}`,
    })

    this.diagramStore.getState().setDiagramId(diagramId)

    // Initialize metadata and diagram type
    const diagramName = options?.model?.title || "Untitled Diagram"
    const diagramType =
      options?.type || options?.model?.type || UMLDiagramType.ClassDiagram
    this.metadataStore
      .getState()
      .updateMetaData(diagramName, parseDiagramType(diagramType))

    if (options?.model) {
      const nodes = options.model.nodes || []
      const edges = options.model.edges || []
      const assessments = options.model.assessments || {}
      this.diagramStore.getState().setNodesAndEdges(nodes, edges)
      this.diagramStore.getState().setAssessments(assessments)
      this.diagramStore.getState().setInteractive(options.model.interactive)
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

    if (
      this.metadataStore.getState().mode === Apollon.ApollonMode.Modelling &&
      !options?.collaborationEnabled
    ) {
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
                value={this.alignmentGuidesStore}
              >
                <AppWithProvider
                  onReactFlowInit={this.setReactFlowInstance.bind(this)}
                />
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

  public fitView(options?: { padding?: number; duration?: number }): void {
    const padding = options?.padding ?? 0.15
    const duration = options?.duration ?? 200
    const maxAttempts = 10
    let attempts = 0

    const attempt = () => {
      attempts++
      const rf = this.reactFlowInstance
      if (!rf) return
      const rfNodes = rf.getNodes()
      const expected = this.diagramStore.getState().nodes.length
      const allMeasured =
        rfNodes.length >= expected &&
        rfNodes.every(
          (n) =>
            (n.measured?.width ?? n.width ?? 0) > 0 &&
            (n.measured?.height ?? n.height ?? 0) > 0
        )
      if (allMeasured || attempts >= maxAttempts) {
        rf.fitView({ padding, duration, maxZoom: 1.0 })
        return
      }
      requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
  }

  set diagramType(type: UMLDiagramType) {
    this.metadataStore.getState().updateDiagramType(type)
    this.diagramStore.getState().setNodesAndEdges([], [])
    this.diagramStore.getState().setAssessments({})
  }

  public destroy() {
    try {
      // Clean up all active subscriptions before destroying
      Object.keys(this.subscribers).forEach((subscriberId) => {
        const unsubscribeCallback = this.subscribers[parseInt(subscriberId)]
        unsubscribeCallback?.()
      })
      this.subscribers = {}

      this.syncManager.stopSync()
      this.root.unmount()
      this.ydoc.destroy()
      this.reactFlowInstance = null
      // Zustand stores are automatically garbage-collected when references are gone
    } catch {
      // ignore
    }
  }

  /**
   * renders a model as a svg and returns it. Therefore the svg is temporarily added to the dom and removed after it has been rendered.
   * @param model the apollon model to export as a svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   * @param theme the theme which should be applied on the svg
   */
  static async exportModelAsSvg(
    model: Apollon.UMLModel,
    options?: Apollon.ExportOptions,
    theme?: DeepPartial<Apollon.Styles>
  ): Promise<Apollon.SVG> {
    void theme
    const container = document.createElement("div")
    container.style.display = "flex"
    container.style.width = "4000px"
    container.style.height = "4000px"
    container.style.zIndex = "-1000"
    container.style.top = "-2000px"
    container.style.position = "absolute"
    container.style.left = "-2000px"
    container.style.visibility = "hidden"

    document.body.appendChild(container)

    const ydoc = new Y.Doc()
    const diagramStore = createDiagramStore(ydoc)
    const metadataStore = createMetadataStore(
      ydoc,
      () => diagramStore.getState().previewMode
    )
    const popoverStore = createPopoverStore()
    const assessmentSelectionStore = createAssessmentSelectionStore()
    const alignmentGuidesStore = createAlignmentGuidesStore()
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

    diagramStore.getState().setNodesAndEdges(model.nodes, model.edges)
    diagramStore.getState().setAssessments(model.assessments)

    // Render the component
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
                <AppWithProvider onReactFlowInit={setReactFlowInstance} />
              </AlignmentGuidesStoreContext.Provider>
            </AssessmentSelectionStoreContext.Provider>
          </PopoverStoreContext.Provider>
        </MetadataStoreContext.Provider>
      </DiagramStoreContext.Provider>
    )

    // Wait for React Flow to initialize
    // Create a timeout promise that resolves to undefined after 3 seconds
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000)
    })

    const reactFlowInstance = await Promise.race([
      reactFlowInstancePromise,
      timeoutPromise,
    ])

    if (!reactFlowInstance) {
      svgRoot.unmount()
      document.body.removeChild(container)
      ydoc.destroy()
      throw new Error("React Flow instance not initialized")
    }

    // Wait for webfonts to load before we measure: canvas text measurement
    // (used by the wrap layout) otherwise falls back to the generic-family
    // metrics and the exported SVG's wrap decisions would drift from the
    // on-screen render. Best-effort — older browsers may lack document.fonts.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready.catch(() => {})
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

    const svgString = getSVG(container, clip, options)

    // Clean up
    svgRoot.unmount()
    document.body.removeChild(container)
    ydoc.destroy()

    return {
      svg: svgString,
      clip,
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
   * absorbed by the room. See `YjsSyncClass.broadcastFullState`.
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
      version: "4.0.0",
      title: diagramTitle,
      type: diagramType,
      nodes: nodes.map((node) => mapFromReactFlowNodeToApollonNode(node)),
      edges: edges.map((edge) => mapFromReactFlowEdgeToApollonEdge(edge)),
      assessments: this.diagramStore.getState().assessments,
      ...(interactive && { interactive }),
    }
  }

  set model(model: Apollon.UMLModel) {
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

  static generateInitialSyncMessage(): string {
    return YjsSyncClass.uint8ToBase64(new Uint8Array([MessageType.YjsSYNC]))
  }

  static generateInitialAwarenessSyncMessage(): string {
    return YjsSyncClass.uint8ToBase64(
      new Uint8Array([MessageType.AwarenessSync])
    )
  }
}
