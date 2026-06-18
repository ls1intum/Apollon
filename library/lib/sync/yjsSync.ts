import { DiagramStore } from "@/store/diagramStore"
import { MetadataStore } from "@/store/metadataStore"
import {
  getAssessments,
  getDiagramMetadata,
  getEdgesMap,
  getNodesMap,
  STORE_ORIGIN,
} from "@/sync/ydoc"
import {
  Assessment,
  CollaborationState,
  CollaborationUser,
  CollaborationViewport,
  CollaboratorInfo,
  DraggingNode,
} from "@/typings"
import {
  sanitizeCollaborationViewport,
  sanitizeDraggingNodes,
} from "@/utils/collaboration"
import { Edge, Node } from "@xyflow/react"
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
} from "y-protocols/awareness"
import * as Y from "yjs"
import { StoreApi } from "zustand"

export enum MessageType {
  YjsSYNC = 0,
  YjsUpdate = 1,
  AwarenessSync = 2,
  AwarenessUpdate = 3,
}

export type SendBroadcastMessage = (base64data: string) => void

export class YjsSync {
  private readonly stopYjsObserver: () => void
  private sendBroadcastMessage: SendBroadcastMessage | null = null
  private readonly ydoc: Y.Doc
  private readonly diagramStore: StoreApi<DiagramStore>
  private readonly metadataStore: StoreApi<MetadataStore>
  private readonly awareness: Awareness

  constructor(
    ydoc: Y.Doc,
    diagramStore: StoreApi<DiagramStore>,
    metadataStore: StoreApi<MetadataStore>
  ) {
    this.ydoc = ydoc
    this.diagramStore = diagramStore
    this.metadataStore = metadataStore
    this.awareness = new Awareness(this.ydoc)
    this.stopYjsObserver = this.startYjsObserver()

    // Route the store's transient drag/resize frames onto the ephemeral
    // awareness channel. The store collects them in `onNodesChange` (collab
    // only) and calls this publisher per frame; peers render the live gesture
    // from awareness, so nothing per-frame is ever written to the document or
    // captured by the UndoManager.
    this.diagramStore
      .getState()
      .setDraggingNodesPublisher(this.setLocalAwarenessDraggingNodes)
  }

  public stopSync() {
    this.stopYjsObserver()
  }

  /**
   * Push the entire local Yjs document as a single `YjsUpdate`. Callers should
   * invoke this after a (re)connect so peers absorb any edits made while we
   * were disconnected — those updates fire while `readyState !== OPEN`, are
   * silently dropped by the send callback, and never replayed otherwise.
   * Yjs CRDTs converge on merge, so peers that already have these ops just
   * no-op.
   */
  public broadcastFullState = () => {
    if (!this.sendBroadcastMessage) return
    const state = Y.encodeStateAsUpdate(this.ydoc)
    this.sendFramedMessage(MessageType.YjsUpdate, state)
  }

  public setSendBroadcastMessage = (sendFn: SendBroadcastMessage) => {
    this.sendBroadcastMessage = sendFn

    const localState = this.awareness.getLocalState()
    if (localState) {
      const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [
        this.awareness.clientID,
      ])
      this.sendFramedMessage(MessageType.AwarenessUpdate, awarenessUpdate)
    }
  }

  public setLocalAwarenessUser = (user: CollaborationUser) => {
    this.awareness.setLocalStateField("user", user)
  }

  public setLocalAwarenessCursor = (
    cursor: { x: number; y: number } | null
  ) => {
    this.awareness.setLocalStateField("cursor", cursor)
  }

  public setLocalAwarenessViewport = (
    viewport: CollaborationViewport | null
  ) => {
    this.awareness.setLocalStateField("viewport", viewport)
  }

  public setLocalAwarenessFollowing = (followingClientId: number | null) => {
    this.awareness.setLocalStateField("followingClientId", followingClientId)
  }

  public setLocalAwarenessSelectedElement = (
    selectedElementId: string | null
  ) => {
    this.awareness.setLocalStateField("selectedElementId", selectedElementId)
  }

  public setLocalAwarenessDraggingNodes = (
    draggingNodes: DraggingNode[] | null
  ) => {
    this.awareness.setLocalStateField("draggingNodes", draggingNodes)
  }

  public setLocalAwarenessState = (state: Partial<CollaborationState>) => {
    const current = this.awareness.getLocalState()
    this.awareness.setLocalState({ ...current, ...state })
  }

  public subscribeToAwarenessChanges = (
    callback: (states: Map<number, CollaborationState>) => void
  ) => {
    const handler = () => callback(this.getTypedStates())
    this.awareness.on("change", handler)
    return () => {
      this.awareness.off("change", handler)
    }
  }

  public getAwarenessStates = (): Map<number, CollaborationState> =>
    this.getTypedStates()

  public getCollaborators = (): CollaboratorInfo[] => {
    const states = this.getTypedStates()
    const localClientId = this.awareness.clientID
    const byUserId = new Map<string, CollaboratorInfo>()

    for (const [clientId, state] of states.entries()) {
      const user = state.user
      if (!user) continue

      const userId = user.id ?? `__client_${clientId}`
      const existing = byUserId.get(userId)

      if (existing) {
        existing.clientIds.push(clientId)
        if (clientId === localClientId) existing.isLocal = true
      } else {
        byUserId.set(userId, {
          id: userId,
          name: user.name,
          color: user.color,
          imageUrl: user.imageUrl,
          clientIds: [clientId],
          isLocal: clientId === localClientId,
        })
      }
    }

    return Array.from(byUserId.values())
  }

  public subscribeToCollaboratorChanges = (
    callback: (collaborators: CollaboratorInfo[]) => void
  ) => {
    let previousSignature = ""

    const handler = ({
      added,
      removed,
    }: {
      added: number[]
      updated: number[]
      removed: number[]
    }) => {
      const currentSignature = this.computeParticipantSignature()
      if (
        added.length === 0 &&
        removed.length === 0 &&
        currentSignature === previousSignature
      ) {
        return
      }
      previousSignature = currentSignature
      callback(this.getCollaborators())
    }

    this.awareness.on("change", handler)
    return () => {
      this.awareness.off("change", handler)
    }
  }

  public getLocalAwarenessClientId = () => this.awareness.clientID

  private static narrowState(raw: unknown): CollaborationState | null {
    if (raw == null || typeof raw !== "object") return null
    const obj = raw as Record<string, unknown>
    const user = obj.user
    if (
      user != null &&
      (typeof user !== "object" ||
        typeof (user as Record<string, unknown>).name !== "string" ||
        typeof (user as Record<string, unknown>).color !== "string")
    ) {
      return null
    }
    // Peer-supplied fields drive `setViewport`/follow, so drop malformed ones
    // here — the single chokepoint every consumer reads through — rather than
    // rejecting the whole state and losing a valid user/cursor alongside.
    const state = { ...obj } as CollaborationState
    if (obj.viewport != null) {
      state.viewport = sanitizeCollaborationViewport(obj.viewport)
    }
    if (obj.draggingNodes != null) {
      state.draggingNodes = sanitizeDraggingNodes(obj.draggingNodes)
    }
    if (
      obj.followingClientId != null &&
      typeof obj.followingClientId !== "number"
    ) {
      state.followingClientId = null
    }
    return state
  }

  private getTypedStates(): Map<number, CollaborationState> {
    const raw = this.awareness.getStates()
    const typed = new Map<number, CollaborationState>()
    for (const [clientId, state] of raw.entries()) {
      const narrowed = YjsSync.narrowState(state)
      if (narrowed) typed.set(clientId, narrowed)
    }
    return typed
  }

  private computeParticipantSignature = (): string => {
    const states = this.getTypedStates()
    const parts: string[] = []
    for (const [clientId, state] of states.entries()) {
      const user = state.user
      if (user) {
        parts.push(
          `${clientId}:${user.id ?? ""}:${user.name}:${user.color}:${user.imageUrl ?? ""}`
        )
      }
    }
    parts.sort()
    return parts.join("|")
  }

  private sendFramedMessage = (
    messageType: MessageType,
    payload: Uint8Array
  ) => {
    if (!this.sendBroadcastMessage) {
      return
    }

    const fullMessage = new Uint8Array(1 + payload.length)
    fullMessage[0] = messageType
    fullMessage.set(payload, 1)

    const base64Message = YjsSync.uint8ToBase64(fullMessage)

    this.sendBroadcastMessage(base64Message)
  }

  private applyUpdate = (update: Uint8Array, transactionOrigin: string) => {
    Y.applyUpdate(this.ydoc, update, transactionOrigin)
  }

  public handleReceivedData = (base64Data: string) => {
    // Decode the base64 string to Uint8Array
    const decodedData = YjsSync.base64ToUint8(base64Data)
    const messageType = decodedData[0]

    if (messageType === MessageType.YjsUpdate) {
      const update = decodedData.slice(1)
      this.applyUpdate(update, "remote")
    } else if (messageType === MessageType.YjsSYNC) {
      const syncMessage = Y.encodeStateAsUpdate(this.ydoc)
      this.sendFramedMessage(MessageType.YjsUpdate, syncMessage)
    } else if (messageType === MessageType.AwarenessUpdate) {
      const awarenessUpdate = decodedData.slice(1)
      applyAwarenessUpdate(this.awareness, awarenessUpdate, "remote")
    } else if (messageType === MessageType.AwarenessSync) {
      const clientIds = Array.from(this.awareness.getStates().keys())
      const awarenessUpdate = encodeAwarenessUpdate(this.awareness, clientIds)
      this.sendFramedMessage(MessageType.AwarenessUpdate, awarenessUpdate)
    }
  }

  private startYjsObserver = () => {
    // While the canvas shows a preview overlay, peer edits keep flowing
    // into Yjs but we hold the local Zustand caches stable so the
    // overlay doesn't flicker. The store's `setPreviewMode(false)` call
    // resyncs Zustand from Yjs at exit time.
    const previewSuppressed = () =>
      this.diagramStore.getState().previewMode === true

    const nodesChangeObserver = (
      _event: Y.YMapEvent<Node>,
      transaction: Y.Transaction
    ) => {
      if (
        transaction.origin !== STORE_ORIGIN &&
        !this.isUndoRedoTransaction(transaction) &&
        !previewSuppressed()
      ) {
        this.diagramStore.getState().updateNodesFromYjs()
      }
    }

    const edgesObserver = (
      _event: Y.YMapEvent<Edge>,
      transaction: Y.Transaction
    ) => {
      if (
        transaction.origin !== STORE_ORIGIN &&
        !this.isUndoRedoTransaction(transaction) &&
        !previewSuppressed()
      ) {
        this.diagramStore.getState().updateEdgesFromYjs()
      }
    }

    const metadataObserver = (
      _event: Y.YMapEvent<string>,
      transaction: Y.Transaction
    ) => {
      if (
        transaction.origin !== STORE_ORIGIN &&
        !this.isUndoRedoTransaction(transaction) &&
        !previewSuppressed()
      ) {
        this.metadataStore.getState().updateMetaDataFromYjs()
      }
    }

    const assessmentObserver = (
      _event: Y.YMapEvent<Assessment>,
      transaction: Y.Transaction
    ) => {
      if (
        transaction.origin !== STORE_ORIGIN &&
        !this.isUndoRedoTransaction(transaction) &&
        !previewSuppressed()
      ) {
        this.diagramStore.getState().updateAssessmentFromYjs()
      }
    }

    const handleYjsUpdate = (
      update: Uint8Array,
      _origin: unknown,
      _doc: Y.Doc,
      transaction: Y.Transaction
    ) => {
      // Broadcast the incremental update for local edits and undo/redo.
      // Late-joining peers receive full state via the YjsSYNC handshake.
      if (
        this.sendBroadcastMessage &&
        (transaction.origin === STORE_ORIGIN ||
          this.isUndoRedoTransaction(transaction))
      ) {
        this.sendFramedMessage(MessageType.YjsUpdate, update)
      }

      // Update store state for undo/redo operations
      if (this.isUndoRedoTransaction(transaction)) {
        this.diagramStore.getState().updateNodesFromYjs()
        this.diagramStore.getState().updateEdgesFromYjs()
        this.diagramStore.getState().updateAssessmentFromYjs()
        this.diagramStore.getState().updateUndoRedoState()
      }
    }

    const handleAwarenessUpdate = (
      {
        added,
        updated,
        removed,
      }: {
        added: number[]
        updated: number[]
        removed: number[]
      },
      origin: unknown
    ) => {
      // Prevent rebroadcast loops for remote updates.
      if (origin === "remote") {
        return
      }

      const changedClients = [...added, ...updated, ...removed]
      if (changedClients.length === 0) {
        return
      }

      const awarenessUpdate = encodeAwarenessUpdate(
        this.awareness,
        changedClients
      )
      this.sendFramedMessage(MessageType.AwarenessUpdate, awarenessUpdate)
    }

    getNodesMap(this.ydoc).observe(nodesChangeObserver)
    getEdgesMap(this.ydoc).observe(edgesObserver)
    getAssessments(this.ydoc).observe(assessmentObserver)
    getDiagramMetadata(this.ydoc).observe(metadataObserver)
    this.ydoc.on("update", handleYjsUpdate)
    this.awareness.on("update", handleAwarenessUpdate)

    return () => {
      getNodesMap(this.ydoc).unobserve(nodesChangeObserver)
      getEdgesMap(this.ydoc).unobserve(edgesObserver)
      getAssessments(this.ydoc).unobserve(assessmentObserver)
      getDiagramMetadata(this.ydoc).unobserve(metadataObserver)
      this.ydoc.off("update", handleYjsUpdate)
      this.awareness.off("update", handleAwarenessUpdate)
    }
  }

  // Helper method to check if a transaction is from undo/redo
  private isUndoRedoTransaction(transaction: Y.Transaction): boolean {
    const undoManager = this.diagramStore.getState().undoManager
    return undoManager ? undoManager === transaction.origin : false
  }

  /**
   *  Convert Uint8Array to Base64 string
   */
  static uint8ToBase64(uint8: Uint8Array): string {
    const toBase64 = (uint8 as Uint8Array & { toBase64?: () => string })
      .toBase64
    if (typeof toBase64 === "function") {
      return toBase64.call(uint8)
    }

    let binary = ""
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i])
    }

    return btoa(binary)
  }

  /**
   * Convert Base64 string to Uint8Array
   */
  static base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}
