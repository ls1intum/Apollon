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
import {
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react"
import { useShallow } from "zustand/shallow"

import { Apollon } from "@tumaet/apollon/react"
import type { UMLModel, UMLDiagramType, DiagramEdgeType } from "@tumaet/apollon"
import { ApollonView } from "@tumaet/apollon/typings"
import { Sidebar } from "@tumaet/apollon/components/Sidebar"
import { EdgeTypePreviewIcon } from "@tumaet/apollon/components/popovers/edgePopovers/EdgeTypePreviewIcon"
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
  useDiagramStore,
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
  height = "100vh",
  dataTheme,
}: {
  model: UMLModel
  height?: number | string
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

/**
 * A fully EDITABLE editor — the real thing: the element palette (sidebar) shows,
 * elements are selectable/movable, and clicking opens edit popups. Pass `model`
 * for a populated sample to edit, or `type` for a blank canvas of that diagram
 * type to build from scratch. This is the surface to verify editing works.
 */
export function ApollonEditable({
  model,
  type,
  height = "100vh",
  dataTheme,
}: {
  model?: UMLModel
  type?: UMLDiagramType
  height?: number | string
  dataTheme?: "light" | "dark"
}) {
  return (
    <Apollon
      defaultModel={model}
      defaultType={type}
      enablePopups
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

/**
 * The node-shape gallery for a diagram type — every palette element rendered via
 * ElementPreview. Apply the EditorStoreDecorator on the story (the SVGs read the
 * stores). Keeps each per-type story file DRY.
 */
export function ElementGallery({ type }: { type: UMLDiagramType }) {
  const configs = elementConfigsFor(type)
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "flex-start",
      }}
    >
      {configs.map((config, i) => (
        <ElementPreview key={`${config.type}-${i}`} config={config} />
      ))}
    </div>
  )
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

// ── Edge path ────────────────────────────────────────────────────────────────
// The real edge components are @xyflow/react edges needing live geometry, so they
// can't render standalone. EdgeTypePreviewIcon is the editor's own faithful
// mini-edge (same getEdgeMarkerStyles + InlineMarker the canvas uses) — a pure
// SVG of the line + start/end markers, no context. It's exactly what the
// edge-type dropdown shows. Markers use currentColor, so a colored wrapper themes it.

/** Every edge type the editor draws, grouped by diagram family (for the gallery). */
export const edgeTypeCatalog: {
  key: DiagramEdgeType
  label: string
  family: UMLDiagramType
}[] = [
  {
    key: "ClassBidirectional",
    label: "Bi-Association",
    family: "ClassDiagram",
  },
  {
    key: "ClassUnidirectional",
    label: "Uni-Association",
    family: "ClassDiagram",
  },
  { key: "ClassAggregation", label: "Aggregation", family: "ClassDiagram" },
  { key: "ClassComposition", label: "Composition", family: "ClassDiagram" },
  { key: "ClassInheritance", label: "Inheritance", family: "ClassDiagram" },
  { key: "ClassDependency", label: "Dependency", family: "ClassDiagram" },
  { key: "ClassRealization", label: "Realization", family: "ClassDiagram" },
  { key: "ObjectLink", label: "Object Link", family: "ObjectDiagram" },
  {
    key: "ActivityControlFlow",
    label: "Control Flow",
    family: "ActivityDiagram",
  },
  { key: "UseCaseAssociation", label: "Association", family: "UseCaseDiagram" },
  { key: "UseCaseInclude", label: "Include", family: "UseCaseDiagram" },
  { key: "UseCaseExtend", label: "Extend", family: "UseCaseDiagram" },
  {
    key: "UseCaseGeneralization",
    label: "Generalization",
    family: "UseCaseDiagram",
  },
  {
    key: "CommunicationLink",
    label: "Message Link",
    family: "CommunicationDiagram",
  },
  {
    key: "ComponentDependency",
    label: "Dependency",
    family: "ComponentDiagram",
  },
  {
    key: "ComponentProvidedInterface",
    label: "Provided Interface",
    family: "ComponentDiagram",
  },
  {
    key: "ComponentRequiredInterface",
    label: "Required Interface",
    family: "ComponentDiagram",
  },
  {
    key: "ComponentRequiredThreeQuarterInterface",
    label: "Required (¾)",
    family: "ComponentDiagram",
  },
  {
    key: "ComponentRequiredQuarterInterface",
    label: "Required (¼)",
    family: "ComponentDiagram",
  },
  {
    key: "DeploymentAssociation",
    label: "Association",
    family: "DeploymentDiagram",
  },
  {
    key: "DeploymentDependency",
    label: "Dependency",
    family: "DeploymentDiagram",
  },
  {
    key: "DeploymentProvidedInterface",
    label: "Provided Interface",
    family: "DeploymentDiagram",
  },
  {
    key: "DeploymentRequiredInterface",
    label: "Required Interface",
    family: "DeploymentDiagram",
  },
  {
    key: "DeploymentRequiredThreeQuarterInterface",
    label: "Required (¾)",
    family: "DeploymentDiagram",
  },
  {
    key: "DeploymentRequiredQuarterInterface",
    label: "Required (¼)",
    family: "DeploymentDiagram",
  },
  { key: "PetriNetArc", label: "Arc", family: "PetriNet" },
  { key: "ReachabilityGraphArc", label: "Arc", family: "ReachabilityGraph" },
  { key: "SfcDiagramEdge", label: "Transition", family: "Sfc" },
  { key: "SyntaxTreeLink", label: "Link", family: "SyntaxTree" },
  { key: "FlowChartFlowline", label: "Flowline", family: "Flowchart" },
  { key: "BPMNSequenceFlow", label: "Sequence Flow", family: "BPMN" },
  { key: "BPMNMessageFlow", label: "Message Flow", family: "BPMN" },
  { key: "BPMNAssociationFlow", label: "Association", family: "BPMN" },
  { key: "BPMNDataAssociationFlow", label: "Data Association", family: "BPMN" },
]

/** One captioned edge-type preview tile. */
export function EdgePreview({
  edgeType,
  label,
}: {
  edgeType: string
  label?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 16px",
        color: "var(--apollon-primary-contrast, #1a1f27)",
      }}
      data-edge-type={edgeType}
    >
      <EdgeTypePreviewIcon edgeType={edgeType} />
      {label && (
        <span style={{ fontSize: 12, color: "var(--home-text-secondary)" }}>
          {label}
        </span>
      )}
    </div>
  )
}

/** The edge-type gallery for a diagram family — every connector via EdgePreview. */
export function EdgeGallery({ family }: { family: UMLDiagramType }) {
  const edges = edgeTypeCatalog.filter((e) => e.family === family)
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
        alignItems: "start",
        width: 540,
      }}
    >
      {edges.map((e) => (
        <div
          key={e.key}
          style={{
            border: "1px solid var(--home-border-subtle)",
            borderRadius: "var(--home-radius-md)",
            background: "var(--home-surface-raised)",
          }}
        >
          <EdgePreview edgeType={e.key} label={e.label} />
        </div>
      ))}
    </div>
  )
}

// ── Popover path ─────────────────────────────────────────────────────────────
// Edit popovers take an `elementId` and read the element from the stores. Node
// popovers need only the seeded DiagramStore; edge + BPMN-node popovers also read
// ReactFlow's nodeLookup/edgeLookup, so a controlled (hidden) <ReactFlow> bound to
// the same store must be mounted (exactly how App.tsx feeds ReactFlow). We render
// the popover CONTENT directly (no Base UI portal/anchor) inside .apollon-editor >
// .apollon-popover so the theme + popup styling apply.

/** Minimal node for seeding a popover. */
export function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown>,
  opts?: { width?: number; height?: number }
): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    width: opts?.width ?? 200,
    height: opts?.height ?? 110,
    data,
  }
}

/** Minimal edge for seeding an edge popover (with two endpoint nodes). */
export function makeEdge(
  id: string,
  type: DiagramEdgeType,
  source: string,
  target: string,
  data: Record<string, unknown> = {}
): Edge {
  return { id, type, source, target, data }
}

// Hidden, controlled ReactFlow bound to the diagram store — populates
// nodeLookup/edgeLookup so useReactiveNode/useReactiveEdge resolve. Same prop
// wiring as App.tsx (nodes/edges/onNodesChange/onEdgesChange from the store).
function HiddenStoreFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useDiagramStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
    }))
  )
  return (
    <div
      aria-hidden
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
    </div>
  )
}

/**
 * Renders an edit popover's content in isolation. `seed` populates the diagram
 * store (add the node/edge whose id the popover renders); the harness provides
 * the three store contexts + a hidden controlled ReactFlow so edge/BPMN popovers
 * resolve their element. Wrap in .apollon-editor (theme vars) > .apollon-popover.
 */
export function SeededPopoverHarness({
  diagramType,
  seed,
  width = 320,
  children,
}: {
  diagramType?: UMLDiagramType
  seed: (
    diagram: ReturnType<typeof createDiagramStore>,
    metadata: ReturnType<typeof createMetadataStore>
  ) => void
  width?: number
  children: React.ReactNode
}) {
  const stores = React.useMemo(() => {
    const ydoc = new Y.Doc()
    const diagram = createDiagramStore(ydoc)
    const metadata = createMetadataStore(ydoc)
    const assessment = createAssessmentSelectionStore()
    if (diagramType) metadata.getState().updateDiagramType(diagramType)
    metadata.getState().setView(ApollonView.Modelling)
    seed(diagram, metadata)
    return { diagram, metadata, assessment }
    // seed is referentially stable per story; diagramType keys the rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramType])

  return (
    <DiagramStoreContext.Provider value={stores.diagram}>
      <MetadataStoreContext.Provider value={stores.metadata}>
        <AssessmentSelectionStoreContext.Provider value={stores.assessment}>
          <ReactFlowProvider>
            <div className="apollon-editor">
              <HiddenStoreFlow />
              <div className="apollon-popover" style={{ width }}>
                {children}
              </div>
            </div>
          </ReactFlowProvider>
        </AssessmentSelectionStoreContext.Provider>
      </MetadataStoreContext.Provider>
    </DiagramStoreContext.Provider>
  )
}
