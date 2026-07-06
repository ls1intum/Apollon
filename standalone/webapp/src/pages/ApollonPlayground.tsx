import React, { useEffect, useMemo, useState } from "react"
import {
  Apollon,
  ApollonMode,
  ApollonView,
  UMLDiagramType,
  ApollonEditor,
  collabColorFromName,
  randomCollabName,
} from "@tumaet/apollon"
import { Button } from "@tumaet/ui/components/button"
import { Checkbox } from "@tumaet/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@tumaet/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumaet/ui/components/select"
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
import { AssessmentScoreChips } from "@/components/AssessmentScoreChips"
import { useShallow } from "zustand/shallow"
import { AssessmentDataBox } from "@/components/playground/AssessmentDataBox"
import { CollapsibleSidebar } from "@/components/playground/CollapsibleSidebar"
import { connectPlaygroundCollaboration } from "@/components/playground/connectPlaygroundCollaboration"
import { ThemeConfigurator } from "@/components/playground/theme/ThemeConfigurator"

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
  const [themeSidebarOpen, setThemeSidebarOpen] = useState(true)
  const [themeOverrides, setThemeOverrides] = useState<Record<string, string>>(
    {}
  )

  const setThemeOverride = (cssVar: string, value: string) =>
    setThemeOverrides((prev) => ({ ...prev, [cssVar]: value }))
  const clearThemeOverride = (cssVar: string) =>
    setThemeOverrides((prev) => {
      const next = { ...prev }
      delete next[cssVar]
      return next
    })
  const resetAllThemeOverrides = () => setThemeOverrides({})

  const revealThemeContext = (
    context: "assessment" | "collaboration" | "highlight"
  ) => {
    if (context === "assessment") setMode(ApollonMode.Assessment)
    else if (context === "highlight") setHighlightEnabled(true)
    else {
      setCollaborationViewportTest(true)
      setTestSidebarOpen(true)
    }
  }
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
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="playground-diagram-type">
              Diagram type
            </FieldLabel>
            <Select
              value={diagramType}
              onValueChange={(value) => setDiagramType(value as UMLDiagramType)}
            >
              <SelectTrigger
                id="playground-diagram-type"
                data-testid="playground-diagram-type"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UMLDiagramTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="playground-mode">Mode</FieldLabel>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as ApollonMode)}
            >
              <SelectTrigger
                id="playground-mode"
                data-testid="playground-mode"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ApollonMode.Modelling}>Modelling</SelectItem>
                <SelectItem value={ApollonMode.Assessment}>
                  Assessment
                </SelectItem>
                <SelectItem value={ApollonMode.Exporting}>Exporting</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {mode === ApollonMode.Assessment && (
            <Field orientation="horizontal">
              <Checkbox
                id="playground-debug"
                checked={debug}
                onCheckedChange={(checked) => setDebug(checked === true)}
              />
              <FieldLabel htmlFor="playground-debug">Debug feedback</FieldLabel>
            </Field>
          )}

          <Field orientation="horizontal">
            <Checkbox
              id="playground-readonly"
              checked={readonly}
              onCheckedChange={(checked) => setReadonly(checked === true)}
            />
            <FieldLabel htmlFor="playground-readonly">Readonly</FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="playground-scroll-lock"
              checked={scrollLock}
              onCheckedChange={(checked) => setScrollLock(checked === true)}
            />
            <FieldLabel htmlFor="playground-scroll-lock">
              Scroll lock
            </FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="playground-highlight"
              checked={highlightEnabled}
              onCheckedChange={(checked) =>
                setHighlightEnabled(checked === true)
              }
            />
            <FieldLabel htmlFor="playground-highlight">
              Enable highlight view
            </FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="collaboration-viewport-test"
              checked={collaborationViewportTest}
              onCheckedChange={(checked) => {
                const enabled = checked === true
                setCollaborationViewportTest(enabled)
                if (enabled) setTestSidebarOpen(true)
              }}
            />
            <FieldLabel htmlFor="collaboration-viewport-test">
              Collaboration viewport test
            </FieldLabel>
          </Field>

          {collaborationViewportTest && (
            <FieldDescription>
              Local user: {collaborationUser.name}. Open a second playground tab
              and enable this test there to exchange live cursors.
            </FieldDescription>
          )}
        </FieldGroup>

        {mode === ApollonMode.Assessment && !readonly && (
          <AssessmentScoreChips />
        )}

        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Export
          </span>
          <Button variant="outline" size="sm" onClick={() => exportAsSvg()}>
            Export as SVG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAsPNG({ setWhiteBackground: true })}
          >
            Export as PNG (white background)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAsPNG({ setWhiteBackground: false })}
          >
            Export as PNG
          </Button>
          <Button variant="outline" size="sm" onClick={exportAsJSON}>
            Export as JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAsPDF()}>
            Export as PDF
          </Button>
        </div>

        <AssessmentDataBox
          assessmentSelectedElements={assessmentSelectedElements}
        />
      </CollapsibleSidebar>

      <div className="flex h-full min-w-0 flex-1">
        <Apollon
          key={mountKey}
          className="playground-apollon-editor"
          theme={
            themeOverrides as Partial<Record<`--apollon-${string}`, string>>
          }
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
        <CollapsibleSidebar
          side="right"
          width={360}
          surface="variant"
          label="theme configuration"
          testId="playground-theme-sidebar"
          open={themeSidebarOpen}
          onToggle={() => setThemeSidebarOpen((open) => !open)}
        >
          <ThemeConfigurator
            overrides={themeOverrides}
            onChange={setThemeOverride}
            onReset={clearThemeOverride}
            onResetAll={resetAllThemeOverrides}
            onReveal={revealThemeContext}
          />
        </CollapsibleSidebar>
      </div>
    </div>
  )
}
