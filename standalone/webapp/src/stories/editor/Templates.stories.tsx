import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLModel } from "@tumaet/apollon"
import { ApollonFixture } from "../_support/editor"

import adapter from "assets/diagramTemplates/Adapter.json"
import bridge from "assets/diagramTemplates/Bridge.json"
import command from "assets/diagramTemplates/Command.json"
import observer from "assets/diagramTemplates/Observer.json"
import factory from "assets/diagramTemplates/Factory.json"

/**
 * The five Gang-of-Four class-diagram templates the webapp ships as starting
 * points, rendered read-only from their serialized models. This is the gallery
 * for eyeballing that each template loads and lays out correctly.
 */
const meta = {
  title: "Editor/Templates",
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

const asModel = (m: unknown) => m as unknown as UMLModel

export const Adapter: Story = {
  args: { model: asModel(adapter) },
}
export const Bridge: Story = {
  args: { model: asModel(bridge) },
}
export const Command: Story = {
  args: { model: asModel(command) },
}
export const Observer: Story = {
  args: { model: asModel(observer) },
}
export const Factory: Story = {
  args: { model: asModel(factory) },
}

/** Dark theme renders the Adapter template with the editor's dark token set. */
export const AdapterDark: Story = {
  args: { model: asModel(adapter), dataTheme: "dark" },
  globals: { theme: "dark" },
}
