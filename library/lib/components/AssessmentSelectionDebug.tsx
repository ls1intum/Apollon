import {
  useAssessmentSelectionStore,
  useDiagramStore,
  useMetadataStore,
} from "../store/context"
import { useShallow } from "zustand/shallow"

export function AssessmentSelectionDebug() {
  const debug = useMetadataStore(useShallow((state) => state.debug))
  const {
    selectedElementIds,
    highlightedElementId,
    isAssessmentSelectionMode,
  } = useAssessmentSelectionStore(
    useShallow((state) => ({
      selectedElementIds: state.selectedElementIds,
      highlightedElementId: state.highlightedElementId,
      isAssessmentSelectionMode: state.isAssessmentSelectionMode,
    }))
  )
  const assessments = useDiagramStore(useShallow((state) => state.assessments))

  if (!isAssessmentSelectionMode || !debug) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "10px",
        fontSize: "12px",
        fontFamily: "monospace",
        zIndex: 1000,
        maxWidth: "300px",
      }}
    >
      <div>
        <strong>Assessment Selection Debug</strong>
      </div>
      <div>Mode: {isAssessmentSelectionMode ? "ON" : "OFF"}</div>
      <div>Highlighted: {highlightedElementId || "none"}</div>
      <div>Selected ({selectedElementIds.length}):</div>
      {selectedElementIds.length > 0 ? (
        <div
          style={{
            margin: "1px 0",
            paddingLeft: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {Array.from(selectedElementIds).map((id) => {
            const assessment = assessments[id] ? assessments[id] : null
            if (!assessment)
              return (
                <div key={id}>
                  <strong>ID:</strong> {id}
                </div>
              )

            return (
              <div
                key={id}
                style={{
                  border: "2px solid var(--apollon-grid)",
                  padding: "4px",
                }}
              >
                <div>
                  <strong>ID:</strong> {id}
                </div>
                <div>
                  <strong>Score:</strong> {assessment.score}
                </div>
                <div>
                  <strong>Element Type:</strong> {assessment.elementType}
                </div>
                <div>
                  <strong>Correction Status:</strong>{" "}
                  {assessment.correctionStatus?.status}
                </div>
                <div>
                  <strong>Correction Description:</strong>{" "}
                  {assessment.correctionStatus?.description}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontStyle: "italic", color: "#666" }}>
          No elements selected
        </div>
      )}
    </div>
  )
}
