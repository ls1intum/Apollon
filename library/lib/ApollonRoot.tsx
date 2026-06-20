import { type ComponentProps } from "react"
import { AppWithProvider } from "./App"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  PopoverStoreContext,
  AssessmentSelectionStoreContext,
  AlignmentGuidesStoreContext,
  EdgeGeometryStoreContext,
  OverlayStoreContext,
} from "./store/context"
import { type ApollonStores } from "./store/createApollonStores"

export interface ApollonRootProps
  extends ComponentProps<typeof AppWithProvider> {
  stores: ApollonStores
}

/**
 * The single provider stack shared by both mount sites (the live editor and the
 * headless SVG exporter). Centralizing it here means a new store is wired once,
 * and both render paths stay structurally identical — only the `collaboration`
 * and `awareness` props differ (real sync vs. no-op for export).
 */
export function ApollonRoot({ stores, ...appProps }: ApollonRootProps) {
  return (
    <DiagramStoreContext.Provider value={stores.diagramStore}>
      <MetadataStoreContext.Provider value={stores.metadataStore}>
        <PopoverStoreContext.Provider value={stores.popoverStore}>
          <AssessmentSelectionStoreContext.Provider
            value={stores.assessmentSelectionStore}
          >
            <AlignmentGuidesStoreContext.Provider
              value={stores.alignmentGuidesStore}
            >
              <EdgeGeometryStoreContext.Provider
                value={stores.edgeGeometryStore}
              >
                <OverlayStoreContext.Provider value={stores.overlayStore}>
                  <AppWithProvider {...appProps} />
                </OverlayStoreContext.Provider>
              </EdgeGeometryStoreContext.Provider>
            </AlignmentGuidesStoreContext.Provider>
          </AssessmentSelectionStoreContext.Provider>
        </PopoverStoreContext.Provider>
      </MetadataStoreContext.Provider>
    </DiagramStoreContext.Provider>
  )
}
