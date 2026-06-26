import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLModel } from "@tumaet/apollon"
import {
  editorStoryMeta,
  ApollonEditable,
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { ClassEditPopover } from "@tumaet/apollon/components/popovers/classDiagram/ClassEditPopover"
import { EdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/ClassDiagramEdgeEditPopover"

import adapter from "assets/diagramTemplates/Adapter.json"
import bridge from "assets/diagramTemplates/Bridge.json"
import command from "assets/diagramTemplates/Command.json"
import observer from "assets/diagramTemplates/Observer.json"
import factory from "assets/diagramTemplates/Factory.json"

const meta = {
  title: "Editor/Class Diagram",
  ...editorStoryMeta,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const asModel = (m: unknown) => m as unknown as UMLModel

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.ClassDiagram} />,
}

/** Editable blank canvas — build a class diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="ClassDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="ClassDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="ClassDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Class node editor — name, stereotype, attributes, methods. */
export const EditClass: Story = {
  name: "Edit: Class",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("class-1", "class", {
            name: "Account",
            stereotype: undefined,
            attributes: [{ id: "a1", name: "+ balance: number" }],
            methods: [{ id: "m1", name: "+ deposit(amount)" }],
          })
        )
      }
    >
      <ClassEditPopover elementId="class-1" />
    </SeededPopoverHarness>
  ),
}

/** Association editor — type, swap, source/target role + multiplicity. */
export const EditAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="ClassDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(makeNode("a", "class", { name: "A" }))
        diagram.getState().addNode(makeNode("b", "class", { name: "B" }))
        diagram.getState().addEdge(
          makeEdge("edge-1", "ClassBidirectional", "a", "b", {
            sourceRole: "owner",
            sourceMultiplicity: "1",
            targetRole: "items",
            targetMultiplicity: "*",
          })
        )
      }}
    >
      <EdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}

// ── Templates (GoF starters) ─────────────────────────────────────────────────
export const TemplateAdapter: Story = {
  name: "Template: Adapter",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(adapter)} />,
}
export const TemplateBridge: Story = {
  name: "Template: Bridge",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(bridge)} />,
}
export const TemplateCommand: Story = {
  name: "Template: Command",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(command)} />,
}
export const TemplateObserver: Story = {
  name: "Template: Observer",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(observer)} />,
}
export const TemplateFactory: Story = {
  name: "Template: Factory",
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={asModel(factory)} />,
}
