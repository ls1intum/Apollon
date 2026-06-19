import * as Y from "yjs"
import type { StoreApi } from "zustand"
import type { DiagramStore } from "@/store/diagramStore"
import type { MetadataStore } from "@/store/metadataStore"
import { YjsSync } from "./yjsSync"

/**
 * Construct a `YjsSync` against minimal stub stores. Intended for
 * tests that exercise the wire protocol (sync/awareness handshake,
 * incremental updates, reconnect behaviour) without dragging the React
 * editor / React-Flow / zustand-with-middleware setup into the harness.
 *
 * Stores expose only the methods the sync class actually invokes. The
 * Yjs observers will call them, but their bodies are no-ops because the
 * test asserts directly against the `Y.Doc` that's returned.
 */
export function createHeadlessSync(ydoc: Y.Doc = new Y.Doc()): {
  ydoc: Y.Doc
  sync: YjsSync
} {
  const noop = () => {}
  const diagramStore: StoreApi<DiagramStore> = {
    getState: () =>
      ({
        updateNodesFromYjs: noop,
        updateEdgesFromYjs: noop,
        updateAssessmentFromYjs: noop,
        updateUndoRedoState: noop,
        setDraggingNodesPublisher: noop,
        undoManager: null,
        // Other DiagramStore fields are typed but never accessed by
        // YjsSync; cast through `unknown` keeps the helper from
        // having to enumerate the full surface.
      }) as unknown as DiagramStore,
    setState: noop,
    subscribe: () => noop,
    getInitialState: () => ({}) as DiagramStore,
  }
  const metadataStore: StoreApi<MetadataStore> = {
    getState: () =>
      ({ updateMetaDataFromYjs: noop }) as unknown as MetadataStore,
    setState: noop,
    subscribe: () => noop,
    getInitialState: () => ({}) as MetadataStore,
  }
  const sync = new YjsSync(ydoc, diagramStore, metadataStore)
  return { ydoc, sync }
}
