import type { Meta, StoryObj } from "@storybook/react-vite"
import { SidebarHarness } from "../_support/editor"

/**
 * The editor's element palette (Sidebar) in isolation, per diagram type — the
 * chrome a modeller drags shapes from. Representative families are shown; the
 * full per-element catalog lives under Editor/Elements.
 */
const meta = {
  title: "Editor/Chrome/Sidebar",
  component: SidebarHarness,
  parameters: { layout: "fullscreen" },
  // `!test`: mounts a ReactFlowProvider + editor stores that pull a second React
  // copy under the Vitest browser runner. Visual — browse in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta<typeof SidebarHarness>

export default meta
type Story = StoryObj<typeof meta>

export const ClassDiagram: Story = { args: { diagramType: "ClassDiagram" } }
export const ActivityDiagram: Story = {
  args: { diagramType: "ActivityDiagram" },
}
export const BPMN: Story = { args: { diagramType: "BPMN" } }
export const PetriNet: Story = { args: { diagramType: "PetriNet" } }
export const Flowchart: Story = { args: { diagramType: "Flowchart" } }

export const ClassDiagramDark: Story = {
  args: { diagramType: "ClassDiagram" },
  globals: { theme: "dark" },
}
