import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { parseDiagramType } from "@/utils"
import * as Y from "yjs"
import { getDiagramMetadata } from "@/sync/ydoc"
import { UMLDiagramType } from "@/types"
import { ApollonMode, ApollonView } from "@/typings"

export type MetadataStore = {
  diagramTitle: string
  diagramType: UMLDiagramType
  mode: ApollonMode
  view: ApollonView
  availableViews: ApollonView[]
  readonly: boolean
  debug: boolean
  scrollLock: boolean
  scrollEnabled: boolean
  setMode: (mode: ApollonMode) => void
  setView: (view: ApollonView) => void
  setAvailableViews: (availableViews: ApollonView[]) => void
  setReadonly: (readonly: boolean) => void
  setScrollLock: (scrollLock: boolean) => void
  setScrollEnabled: (scrollEnabled: boolean) => void
  updateDiagramTitle: (diagramTitle: string) => void
  updateDiagramType: (diagramType: UMLDiagramType) => void
  updateMetaData: (diagramTitle: string, diagramType: UMLDiagramType) => void
  updateMetaDataFromYjs: () => void
  reset: () => void
  setDebug: (debug: boolean) => void
}

type InitialMetadataState = {
  diagramTitle: string
  diagramType: UMLDiagramType
  mode: ApollonMode
  view: ApollonView
  availableViews: ApollonView[]
  readonly: boolean
  debug: boolean
  scrollLock: boolean
  scrollEnabled: boolean
}
const initialMetadataState: InitialMetadataState = {
  diagramTitle: "Untitled Diagram",
  diagramType: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  view: ApollonView.Modelling,
  availableViews: [ApollonView.Modelling],
  readonly: false,
  debug: false,
  scrollLock: false,
  scrollEnabled: false,
}

export const createMetadataStore = (
  ydoc: Y.Doc
): UseBoundStore<StoreApi<MetadataStore>> =>
  create<MetadataStore>()(
    devtools(
      subscribeWithSelector((set) => ({
        ...initialMetadataState,

        updateDiagramTitle: (diagramTitle) => {
          ydoc.transact(() => {
            getDiagramMetadata(ydoc).set("diagramTitle", diagramTitle)
          }, "store")
          set({ diagramTitle }, undefined, "updateDiagramTitle")
        },

        updateDiagramType: (type) => {
          ydoc.transact(() => {
            getDiagramMetadata(ydoc).set("diagramType", type)
          }, "store")
          set({ diagramType: type }, undefined, "updateDiagramType")
        },

        updateMetaData: (diagramTitle, diagramType) => {
          ydoc.transact(() => {
            getDiagramMetadata(ydoc).set("diagramTitle", diagramTitle)
            getDiagramMetadata(ydoc).set("diagramType", diagramType)
          }, "store")
          set(
            {
              diagramTitle,
              diagramType,
            },
            undefined,
            "updateMetaData"
          )
        },

        updateMetaDataFromYjs: () =>
          set(
            {
              diagramTitle:
                getDiagramMetadata(ydoc).get("diagramTitle") ||
                "Untitled Diagram",
              diagramType: parseDiagramType(
                getDiagramMetadata(ydoc).get("diagramType")
              ),
            },
            undefined,
            "updateMetaDataFromYjs"
          ),

        setMode: (mode) => {
          set({ mode }, undefined, "setMode")
        },

        setView: (view) => {
          set({ view }, undefined, "setView")
        },

        setAvailableViews: (availableViews) => {
          set(
            { availableViews },
            undefined,
            "setAvailableViews"
          )
        },

        setReadonly: (readonly) => {
          set({ readonly }, undefined, "setReadonly")
        },

        setScrollLock: (scrollLock: boolean) => {
          set({ scrollLock }, undefined, "setScrollLock")
        },

        setScrollEnabled: (scrollEnabled: boolean) => {
          set({ scrollEnabled }, undefined, "setScrollEnabled")
        },

        setDebug: (debug) => {
          set({ debug }, undefined, "setDebug")
        },

        reset: () => {
          set(initialMetadataState, undefined, "reset")
        },
      })),
      { name: "MetadataStore", enabled: true }
    )
  )
