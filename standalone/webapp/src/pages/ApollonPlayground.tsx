import React, { useEffect, useMemo, useState } from "react"
import {
  Apollon,
  ApollonMode,
  ApollonView,
  UMLDiagramType,
  type ApollonEditor,
} from "@tumaet/apollon/react"
import { useEditorContext } from "@/contexts"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import {
  PlaygroundDefaultModel,
  playgroundModelId,
} from "@/constants/playgroundDefaultDiagram"
import {
  useExportAsSVG,
  useExportAsPNG,
  useExportAsJSON,
  useExportAsPDF,
} from "@/hooks"
import { FeedbackBoxes } from "@/components/FeedbackBoxes"
import { useShallow } from "zustand/shallow"
import { AssessmentDataBox } from "@/components/playground/AssessmentDataBox"

const UMLDiagramTypes = Object.values(UMLDiagramType)

export const ApollonPlayground: React.FC = () => {
  const { setEditor } = useEditorContext()
  const [assessmentSelectedElements, setAssessmentSelectedElements] = useState<
    string[]
  >([])
  const exportAsSvg = useExportAsSVG()
  const exportAsPNG = useExportAsPNG()
  const exportAsJSON = useExportAsJSON()
  const exportAsPDF = useExportAsPDF()
  const diagram = usePersistenceModelStore(
    (store) => store.models[PlaygroundDefaultModel.id]
  )
  const { updateModel, setCurrentModelId } = usePersistenceModelStore(
    useShallow((store) => ({
      updateModel: store.updateModel,
      setCurrentModelId: store.setCurrentModelId,
    }))
  )

  // Reactive props — toggled live without rebuilding the editor.
  const [mode, setMode] = useState<ApollonMode>(ApollonMode.Modelling)
  const [readonly, setReadonly] = useState(false)
  const [scrollLock, setScrollLock] = useState(false)

  // Initial-only props — changes force a remount via `mountKey`.
  const [diagramType, setDiagramType] = useState<UMLDiagramType>(
    diagram.model.type as UMLDiagramType
  )
  const [highlightEnabled, setHighlightEnabled] = useState(false)
  const [debug, setDebug] = useState(false)

  const availableViews = useMemo(
    () =>
      highlightEnabled
        ? [ApollonView.Modelling, ApollonView.Highlight]
        : [ApollonView.Modelling],
    [highlightEnabled]
  )

  // Remount when any snapshotted-at-mount input changes.
  const mountKey = useMemo(
    () => `${diagramType}|${highlightEnabled}|${debug}`,
    [diagramType, highlightEnabled, debug]
  )

  useEffect(() => {
    setCurrentModelId(playgroundModelId)
  }, [setCurrentModelId])

  const defaultModel = useMemo(
    () => ({ ...diagram.model, type: diagramType }),
    // Snapshotted on mount alongside `mountKey`; reading the latest store
    // value here is intentional so a remount picks up persisted edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mountKey]
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        height: "100%",
      }}
    >
      <div className="flex flex-col p-4 gap-2 overflow-scroll w-[300px]  bg-[var(--apollon-background-variant)] text-[var(--apollon-primary-contrast)]">
        <div>
          <label className="font-semibold ">Select Diagram Type</label>
          <select
            className="border-2 border-gray-400 p-1 rounded-md flex w-[200px]"
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value as UMLDiagramType)}
          >
            {UMLDiagramTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold ">Mode</label>
          <select
            value={mode}
            className="border-2 border-gray-400 p-1 rounded-md flex w-[200px] "
            onChange={(e) => setMode(e.target.value as ApollonMode)}
          >
            <option value={ApollonMode.Assessment}>Assessment</option>
            <option value={ApollonMode.Exporting}>Exporting</option>
            <option value={ApollonMode.Modelling}>Modelling</option>
          </select>
        </div>

        {mode === ApollonMode.Assessment && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={debug}
              onChange={(event) => setDebug(event.target.checked)}
            />
            <label className="font-semibold">Debug Mode for See feedback</label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={readonly}
            onChange={(event) => setReadonly(event.target.checked)}
          />
          <label className="font-semibold">Readonly</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={scrollLock}
            onChange={(event) => setScrollLock(event.target.checked)}
          />
          <label className="font-semibold">Scroll Lock</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={highlightEnabled}
            onChange={(event) => setHighlightEnabled(event.target.checked)}
          />
          <label className="font-semibold">Enable Highlight View</label>
        </div>

        {mode === ApollonMode.Assessment && !readonly && <FeedbackBoxes />}

        <button onClick={() => exportAsSvg()} className="border p-1 rounded-sm">
          Export as SVG
        </button>
        <button
          onClick={() => exportAsPNG({ setWhiteBackground: true })}
          className="border p-1 rounded-sm"
        >
          Export as PNG(White Background)
        </button>
        <button
          onClick={() => exportAsPNG({ setWhiteBackground: false })}
          className="border p-1 rounded-sm"
        >
          Export as PNG
        </button>
        <button onClick={exportAsJSON} className="border p-1 rounded-sm">
          Export as JSON
        </button>
        <button onClick={() => exportAsPDF()} className="border p-1 rounded-sm">
          Export as PDF
        </button>

        <AssessmentDataBox
          assessmentSelectedElements={assessmentSelectedElements}
        />
      </div>

      <Apollon
        key={mountKey}
        defaultModel={defaultModel}
        defaultType={diagramType}
        availableViews={availableViews}
        debug={debug}
        mode={mode}
        readonly={readonly}
        scrollLock={scrollLock}
        style={{ display: "flex", flex: 1, height: "100%" }}
        onMount={(editor: ApollonEditor) => {
          setEditor(editor)
          const modelSubId = editor.subscribeToModelChange((model) =>
            updateModel(model)
          )
          const assessmentSubId = editor.subscribeToAssessmentSelection(
            (selectedElements) =>
              setAssessmentSelectedElements(selectedElements)
          )
          return () => {
            editor.unsubscribe(modelSubId)
            editor.unsubscribe(assessmentSubId)
            setEditor(undefined)
          }
        }}
      />
    </div>
  )
}
