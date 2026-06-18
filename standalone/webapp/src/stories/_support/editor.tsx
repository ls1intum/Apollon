/* Shared foundation for the editor (@tumaet/apollon) stories.
 *
 * Two render paths, mirroring the audit:
 *  - <ApollonFixture> renders a full read-only editor from a serialized UMLModel
 *    fixture. This is the canonical "show every diagram" path — the editor wires
 *    its own stores/ReactFlow internally, so no decorator is needed.
 *  - <ElementPreview> + EditorStoreDecorator render a single SVG element renderer
 *    in isolation (the same call the Sidebar makes for its drag ghosts), wrapped
 *    in the three zustand store contexts those SVGs read.
 *
 * Everything resolves from source via the webapp's vite aliases (@tumaet/apollon
 * -> library/lib) so stories stay in lockstep with the editor.
 */
import * as React from "react"
import type { Decorator } from "@storybook/react-vite"
import * as Y from "yjs"
import { ReactFlowProvider } from "@xyflow/react"

import { Apollon } from "@tumaet/apollon/react"
import type { UMLModel, UMLDiagramType } from "@tumaet/apollon"
import { ApollonView } from "@tumaet/apollon/typings"
import { Sidebar } from "@tumaet/apollon/components/Sidebar"
import {
  DROPS,
  dropElementConfigs,
  type DropElementConfig,
} from "@tumaet/apollon/constants"
import {
  createDiagramStore,
  createMetadataStore,
  createAssessmentSelectionStore,
  DiagramStoreContext,
  MetadataStoreContext,
  AssessmentSelectionStoreContext,
} from "@tumaet/apollon/store"

// ── Fixtures ────────────────────────────────────────────────────────────────
// The 13 canonical per-type diagrams (also drive the visual-regression suite)
// plus the GoF class-diagram templates. Imported as data; cast once here.
import classDiagram from "../../../tests/fixtures/class-diagram.json"
import objectDiagram from "../../../tests/fixtures/object-diagram.json"
import activityDiagram from "../../../tests/fixtures/activity-diagram.json"
import useCaseDiagram from "../../../tests/fixtures/use-case-diagram.json"
import communicationDiagram from "../../../tests/fixtures/communication-diagram.json"
import componentDiagram from "../../../tests/fixtures/component-diagram.json"
import deploymentDiagram from "../../../tests/fixtures/deployment-diagram.json"
import petriNet from "../../../tests/fixtures/petri-net.json"
import reachabilityGraph from "../../../tests/fixtures/reachability-graph.json"
import syntaxTree from "../../../tests/fixtures/syntax-tree.json"
import flowchart from "../../../tests/fixtures/flowchart.json"
import bpmn from "../../../tests/fixtures/bpmn.json"
import sfc from "../../../tests/fixtures/sfc.json"

const asModel = (m: unknown) => m as unknown as UMLModel

/** Every diagram type → its sample model, in palette order. */
export const diagramFixtures: {
  key: UMLDiagramType
  label: string
  model: UMLModel
}[] = [
  { key: "ClassDiagram", label: "Class Diagram", model: asModel(classDiagram) },
  {
    key: "ObjectDiagram",
    label: "Object Diagram",
    model: asModel(objectDiagram),
  },
  {
    key: "ActivityDiagram",
    label: "Activity Diagram",
    model: asModel(activityDiagram),
  },
  {
    key: "UseCaseDiagram",
    label: "Use Case Diagram",
    model: asModel(useCaseDiagram),
  },
  {
    key: "CommunicationDiagram",
    label: "Communication Diagram",
    model: asModel(communicationDiagram),
  },
  {
    key: "ComponentDiagram",
    label: "Component Diagram",
    model: asModel(componentDiagram),
  },
  {
    key: "DeploymentDiagram",
    label: "Deployment Diagram",
    model: asModel(deploymentDiagram),
  },
  { key: "PetriNet", label: "Petri Net", model: asModel(petriNet) },
  {
    key: "ReachabilityGraph",
    label: "Reachability Graph",
    model: asModel(reachabilityGraph),
  },
  { key: "SyntaxTree", label: "Syntax Tree", model: asModel(syntaxTree) },
  { key: "Flowchart", label: "Flowchart", model: asModel(flowchart) },
  { key: "BPMN", label: "BPMN", model: asModel(bpmn) },
  { key: "Sfc", label: "SFC", model: asModel(sfc) },
]

export const fixtureByType: Record<string, UMLModel> = Object.fromEntries(
  diagramFixtures.map((f) => [f.key, f.model])
)

// ── Full-editor path ──────────────────────────────────────────────────────
/**
 * A read-only editor showing a complete diagram. Sized container is required —
 * the canvas renders blank with zero height. Use with `layout: "fullscreen"`.
 */
export function ApollonFixture({
  model,
  height = 560,
  dataTheme,
}: {
  model: UMLModel
  height?: number
  dataTheme?: "light" | "dark"
}) {
  return (
    <Apollon
      readonly
      defaultModel={model}
      dataTheme={dataTheme}
      style={{ height, width: "100%" }}
    />
  )
}

// ── Single-element path ─────────────────────────────────────────────────────
/**
 * Provide the three zustand store contexts the SVG element renderers read
 * (assessments / selection / metadata). Fresh empty stores from one Y.Doc, like
 * a blank editor. Apply on the element-gallery story meta.
 */
export const EditorStoreDecorator: Decorator = (Story) => {
  const stores = React.useMemo(() => {
    const ydoc = new Y.Doc()
    return {
      diagram: createDiagramStore(ydoc),
      metadata: createMetadataStore(ydoc),
      assessment: createAssessmentSelectionStore(),
    }
  }, [])
  return (
    <DiagramStoreContext.Provider value={stores.diagram}>
      <MetadataStoreContext.Provider value={stores.metadata}>
        <AssessmentSelectionStoreContext.Provider value={stores.assessment}>
          <Story />
        </AssessmentSelectionStoreContext.Provider>
      </MetadataStoreContext.Provider>
    </DiagramStoreContext.Provider>
  )
}

/** Render one element config exactly as the Sidebar renders its drag ghost. */
export function ElementPreview({ config }: { config: DropElementConfig }) {
  const scale = DROPS.SIDEBAR_PREVIEW_SCALE
  return (
    <div
      style={{ width: config.width * scale, height: config.height * scale }}
      data-element-type={config.type}
    >
      {React.createElement(
        config.svg as React.ComponentType<Record<string, unknown>>,
        {
          width: config.width,
          height: config.height,
          ...config.defaultData,
          data: config.defaultData,
          SIDEBAR_PREVIEW_SCALE: scale,
          id: `preview_${config.type}_${(config.defaultData as { name?: string })?.name ?? ""}`,
        }
      )}
    </div>
  )
}

/** All element configs for a diagram type (drives a per-family element gallery). */
export function elementConfigsFor(
  type: UMLDiagramType
): readonly DropElementConfig[] {
  return dropElementConfigs[type] ?? []
}

// ── Editor chrome path ──────────────────────────────────────────────────────
/**
 * The editor Sidebar (element palette) in isolation, per diagram type. The
 * Sidebar reads diagramType/view from the MetadataStore and renders one
 * DraggableGhost per palette element; DraggableGhost calls `useReactFlow()`, so
 * a ReactFlowProvider is required — it's @xyflow/react's documented way to
 * mount flow-aware components outside the full canvas, not a workaround. Seeds
 * the metadata store with the requested type + Modelling view.
 */
export function SidebarHarness({
  diagramType,
}: {
  diagramType: UMLDiagramType
}) {
  const stores = React.useMemo(() => {
    const ydoc = new Y.Doc()
    const diagram = createDiagramStore(ydoc)
    const metadata = createMetadataStore(ydoc)
    const assessment = createAssessmentSelectionStore()
    metadata.getState().updateDiagramType(diagramType)
    metadata.getState().setView(ApollonView.Modelling)
    return { diagram, metadata, assessment }
  }, [diagramType])

  return (
    <DiagramStoreContext.Provider value={stores.diagram}>
      <MetadataStoreContext.Provider value={stores.metadata}>
        <AssessmentSelectionStoreContext.Provider value={stores.assessment}>
          <ReactFlowProvider>
            <div style={{ height: 600, display: "flex" }}>
              <Sidebar />
            </div>
          </ReactFlowProvider>
        </AssessmentSelectionStoreContext.Provider>
      </MetadataStoreContext.Provider>
    </DiagramStoreContext.Provider>
  )
}
