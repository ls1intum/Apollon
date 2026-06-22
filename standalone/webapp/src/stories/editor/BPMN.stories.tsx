import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SidebarHarness,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { BPMNTaskEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNTaskEditPopover"
import { BPMNStartEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNStartEventEditPopover"
import { BPMNIntermediateEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNIntermediateEventEditPopover"
import { BPMNEndEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNEndEventEditPopover"
import { BPMNGatewayEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNGatewayEditPopover"
import { BPMNPoolEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNPoolEditPopover"
import { BPMNDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/BPMNDiagramEdgeEditPopover"

/**
 * Everything for the **BPMN** diagram in one place: the full diagram, the
 * element palette, every node shape, every edge (flow) type, and the edit
 * popovers (task, event, gateway, pool, sequence flow). Each BPMN node popover
 * resolves its element via the harness's hidden ReactFlow. Tagged `!test` —
 * these mount editor source (a second React copy under the Vitest browser
 * runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/BPMN",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── The whole diagram ────────────────────────────────────────────────────────
export const Diagram: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.BPMN} />,
}

/** The element palette (drag source) for this diagram type. */
export const Palette: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SidebarHarness diagramType="BPMN" />,
}

// ── The parts ────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="BPMN" />,
}

/** Every flow (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="BPMN" />,
}

// ── Popovers (the edit UIs) ──────────────────────────────────────────────────
/** Task editor — style, task type, and activity marker. */
export const TaskPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-task", "bpmnTask", {
            name: "Review Application",
            taskType: "user",
            marker: "loop",
          })
        )
      }
    >
      <BPMNTaskEditPopover elementId="bpmn-task" />
    </SeededPopoverHarness>
  ),
}

/** Start-event editor — name and start trigger type. */
export const StartEventPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-start", "bpmnStartEvent", {
            name: "Application Received",
            eventType: "message",
          })
        )
      }
    >
      <BPMNStartEventEditPopover elementId="bpmn-start" />
    </SeededPopoverHarness>
  ),
}

/** Intermediate-event editor — name and catch/throw trigger type. */
export const IntermediateEventPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-intermediate", "bpmnIntermediateEvent", {
            name: "Await Confirmation",
            eventType: "message-catch",
          })
        )
      }
    >
      <BPMNIntermediateEventEditPopover elementId="bpmn-intermediate" />
    </SeededPopoverHarness>
  ),
}

/** End-event editor — name and end result type. */
export const EndEventPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-end", "bpmnEndEvent", {
            name: "Application Rejected",
            eventType: "error",
          })
        )
      }
    >
      <BPMNEndEventEditPopover elementId="bpmn-end" />
    </SeededPopoverHarness>
  ),
}

/** Gateway editor — name and gateway type. */
export const GatewayPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-gateway", "bpmnGateway", {
            name: "Eligible?",
            gatewayType: "exclusive",
          })
        )
      }
    >
      <BPMNGatewayEditPopover elementId="bpmn-gateway" />
    </SeededPopoverHarness>
  ),
}

/** Pool editor — pool name. */
export const PoolPopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("bpmn-pool", "bpmnPool", {
            name: "Loan Department",
          })
        )
      }
    >
      <BPMNPoolEditPopover elementId="bpmn-pool" />
    </SeededPopoverHarness>
  ),
}

/** Sequence-flow editor — style, edge type, connection, and label. */
export const SequenceFlowEdgePopover: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="BPMN"
      width={360}
      seed={(diagram) => {
        diagram
          .getState()
          .addNode(makeNode("from", "bpmnTask", { name: "Review Application" }))
        diagram
          .getState()
          .addNode(makeNode("to", "bpmnGateway", { name: "Eligible?" }))
        diagram.getState().addEdge(
          makeEdge("bpmn-edge", "BPMNSequenceFlow", "from", "to", {
            label: "approved",
          })
        )
      }}
    >
      <BPMNDiagramEdgeEditPopover elementId="bpmn-edge" />
    </SeededPopoverHarness>
  ),
}

/** The whole diagram, dark theme. */
export const Dark: Story = {
  ...Diagram,
  globals: { theme: "dark" },
}
