import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLModel } from "@tumaet/apollon"
import { ApollonFixture } from "../_support/editor"

import adapter from "assets/diagramTemplates/Adapter.json"
import bridge from "assets/diagramTemplates/Bridge.json"
import command from "assets/diagramTemplates/Command.json"
import observer from "assets/diagramTemplates/Observer.json"
import factory from "assets/diagramTemplates/Factory.json"

/** The Gang-of-Four starter templates (class diagrams) the app ships. */
const meta = {
  title: "Editor/Class Diagram/Templates",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const asModel = (m: unknown) => m as unknown as UMLModel

export const Adapter: Story = {
  render: () => <ApollonFixture model={asModel(adapter)} />,
}
export const Bridge: Story = {
  render: () => <ApollonFixture model={asModel(bridge)} />,
}
export const Command: Story = {
  render: () => <ApollonFixture model={asModel(command)} />,
}
export const Observer: Story = {
  render: () => <ApollonFixture model={asModel(observer)} />,
}
export const Factory: Story = {
  render: () => <ApollonFixture model={asModel(factory)} />,
}
