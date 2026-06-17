import React, { useEffect, useMemo, useState } from "react"
import {
  Apollon,
  ApollonMode,
  ApollonView,
  UMLDiagramType,
  ApollonEditor,
  collabColorFromName,
  randomCollabName,
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
import { CollapsibleSidebar } from "@/components/playground/CollapsibleSidebar"
import { connectPlaygroundCollaboration } from "@/components/playground/connectPlaygroundCollaboration"

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

  const [mode, setMode] = useState<ApollonMode>(ApollonMode.Modelling)
  const [readonly, setReadonly] = useState(false)
  const [scrollLock, setScrollLock] = useState(false)
  const [diagramType, setDiagramType] = useState<UMLDiagramType>(
    diagram.model.type as UMLDiagramType
  )
  const [highlightEnabled, setHighlightEnabled] = useState(false)
  const [debug, setDebug] = useState(false)
  const [collaborationViewportTest, setCollaborationViewportTest] =
    useState(false)
  const [controlsSidebarOpen, setControlsSidebarOpen] = useState(true)
  const [testSidebarOpen, setTestSidebarOpen] = useState(true)
  const [collaborationUser] = useState(() => {
    const name = randomCollabName()
    return { name, color: collabColorFromName(name) }
  })

  const availableViews = useMemo(
    () =>
      highlightEnabled
        ? [ApollonView.Modelling, ApollonView.Highlight]
        : [ApollonView.Modelling],
    [highlightEnabled]
  )

  const mountKey = useMemo(
    () =>
      `${diagramType}|${highlightEnabled}|${debug}|${collaborationViewportTest}`,
    [diagramType, highlightEnabled, debug, collaborationViewportTest]
  )

  useEffect(() => {
    setCurrentModelId(playgroundModelId)
  }, [setCurrentModelId])

  // <Apollon> snapshots `defaultModel` on mount (initial-only prop) and is
  // remounted via `key={mountKey}`, so a plain derived value is correct — the
  // compiler memoizes it, and no stale-closure suppression is needed.
  const defaultModel = { ...diagram.model, type: diagramType }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        height: "100%",
      }}
    >
      <CollapsibleSidebar
        side="left"
        width={300}
        surface="variant"
        label="playground controls"
        testId="playground-controls-sidebar"
        open={controlsSidebarOpen}
        onToggle={() => setControlsSidebarOpen((open) => !open)}
      >
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

        <div className="flex items-center gap-2">
          <input
            id="collaboration-viewport-test"
            type="checkbox"
            checked={collaborationViewportTest}
            onChange={(event) => {
              const enabled = event.target.checked
              setCollaborationViewportTest(enabled)
              if (enabled) setTestSidebarOpen(true)
            }}
          />
          <label
            className="font-semibold"
            htmlFor="collaboration-viewport-test"
          >
            Collaboration viewport test
          </label>
        </div>

        {collaborationViewportTest && (
          <p className="m-0 text-xs">
            Local user: {collaborationUser.name}. Open a second playground tab
            and enable this test there to exchange live cursors.
          </p>
        )}

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
      </CollapsibleSidebar>

      <div className="flex h-full min-w-0 flex-1">
        <Apollon
          key={mountKey}
          defaultModel={defaultModel}
          availableViews={availableViews}
          collaboration={
            collaborationViewportTest
              ? {
                  enabled: true,
                  user: collaborationUser,
                  showPresence: true,
                  showCursors: true,
                  showSelectionHighlights: true,
                  showFollow: true,
                }
              : undefined
          }
          debug={debug}
          mode={mode}
          readonly={readonly}
          scrollLock={scrollLock}
          style={{ display: "flex", flex: 1, minWidth: 0, height: "100%" }}
          onMount={(editor: ApollonEditor) => {
            setEditor(editor)
            const disconnectCollaboration = collaborationViewportTest
              ? connectPlaygroundCollaboration(editor, {
                  document: ApollonEditor.generateInitialSyncMessage(),
                  awareness:
                    ApollonEditor.generateInitialAwarenessSyncMessage(),
                })
              : () => {}
            const modelSubId = editor.subscribeToModelChange((model) =>
              updateModel(model)
            )
            const assessmentSubId = editor.subscribeToAssessmentSelection(
              (selectedElements) =>
                setAssessmentSelectedElements(selectedElements)
            )
            return () => {
              disconnectCollaboration()
              editor.unsubscribe(modelSubId)
              editor.unsubscribe(assessmentSubId)
              setEditor(undefined)
            }
          }}
        />
        {collaborationViewportTest && (
          <CollapsibleSidebar
            side="right"
            width={320}
            label="test sidebar"
            testId="collaboration-viewport-sidebar"
            open={testSidebarOpen}
            onToggle={() => setTestSidebarOpen((open) => !open)}
          >
            <h2 className="m-0 text-base font-semibold">Problem statement</h2>
            <p className="text-sm leading-normal">
              This inline panel simulates host application chrome that reduces
              the available modeling width. Open this playground in two tabs,
              enable the collaboration viewport test in both, and collapse this
              panel in only one tab.
            </p>
          </CollapsibleSidebar>
        )}
      </div>
    </div>
  )
}
