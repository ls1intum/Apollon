import type { Meta, StoryObj } from "@storybook/react-vite"
import { SeededPopoverHarness, makeNode, makeEdge } from "../_support/editor"
import { BPMNTaskEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNTaskEditPopover"
import { BPMNStartEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNStartEventEditPopover"
import { BPMNIntermediateEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNIntermediateEventEditPopover"
import { BPMNEndEventEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNEndEventEditPopover"
import { BPMNGatewayEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNGatewayEditPopover"
import { BPMNPoolEditPopover } from "@tumaet/apollon/components/popovers/bpmnDiagram/BPMNPoolEditPopover"
import { BPMNDiagramEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/BPMNDiagramEdgeEditPopover"

/** The BPMN edit popovers, rendered in isolation against a seeded store. */
const meta = {
  title: "Editor/BPMN/Popovers",
  parameters: { layout: "centered" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Task editor — style, task type, and activity marker. */
export const Task: Story = {
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
export const StartEvent: Story = {
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
export const IntermediateEvent: Story = {
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
export const EndEvent: Story = {
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
export const Gateway: Story = {
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
export const Pool: Story = {
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
export const SequenceFlow: Story = {
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
