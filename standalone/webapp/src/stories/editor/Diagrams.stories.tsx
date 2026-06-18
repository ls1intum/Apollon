import type { Meta, StoryObj } from "@storybook/react-vite"
import { ApollonFixture, fixtureByType } from "../_support/editor"

/**
 * Every diagram type the editor supports, rendered read-only from its sample
 * model. This is the canonical gallery for eyeballing that all 13 diagram
 * families render correctly in light and dark.
 */
const meta = {
  title: "Editor/Diagrams",
  component: ApollonFixture,
  parameters: { layout: "fullscreen" },
  // `!test` excludes from the Vitest browser interaction run: the full editor
  // mounts an imperative React root + canvas that pulls a second React copy
  // under the test runner. These stories are *visual* (browse them in the
  // Storybook UI) and their rendering is already regression-tested by the
  // Playwright visual suite. They still build and render in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta<typeof ApollonFixture>

export default meta
type Story = StoryObj<typeof meta>

export const ClassDiagram: Story = {
  args: { model: fixtureByType.ClassDiagram },
}
export const ObjectDiagram: Story = {
  args: { model: fixtureByType.ObjectDiagram },
}
export const ActivityDiagram: Story = {
  args: { model: fixtureByType.ActivityDiagram },
}
export const UseCaseDiagram: Story = {
  args: { model: fixtureByType.UseCaseDiagram },
}
export const CommunicationDiagram: Story = {
  args: { model: fixtureByType.CommunicationDiagram },
}
export const ComponentDiagram: Story = {
  args: { model: fixtureByType.ComponentDiagram },
}
export const DeploymentDiagram: Story = {
  args: { model: fixtureByType.DeploymentDiagram },
}
export const PetriNet: Story = { args: { model: fixtureByType.PetriNet } }
export const ReachabilityGraph: Story = {
  args: { model: fixtureByType.ReachabilityGraph },
}
export const SyntaxTree: Story = { args: { model: fixtureByType.SyntaxTree } }
export const Flowchart: Story = { args: { model: fixtureByType.Flowchart } }
export const BPMN: Story = { args: { model: fixtureByType.BPMN } }
export const SFC: Story = { args: { model: fixtureByType.Sfc } }

/** Dark theme renders the same model with the editor's dark token set. */
export const ClassDiagramDark: Story = {
  args: { model: fixtureByType.ClassDiagram, dataTheme: "dark" },
  globals: { theme: "dark" },
}
