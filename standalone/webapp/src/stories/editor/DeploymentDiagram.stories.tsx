import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonEditable,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
  SeededPopoverHarness,
  makeNode,
  makeEdge,
} from "../_support/editor"
import { DeploymentComponentEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentComponentEditPopover"
import { DeploymentNodeEditPopover } from "@tumaet/apollon/components/popovers/deploymentDiagram/DeploymentNodeEditPopover"
import { DeploymentEdgeEditPopover } from "@tumaet/apollon/components/popovers/edgePopovers/DeploymentDiagramEdgeEditPopover"

/**
 * **Deployment Diagram** — the complete overview. `Playground` is the real,
 * editable editor (palette, selection, edit popups) loaded with a sample;
 * `Blank` is an empty editable canvas; `Elements` / `Edges` are galleries of
 * every shape / connector; the `Edit:` stories are the edit popovers. Use the
 * toolbar to switch light / dark. Everything for this diagram type lives in this
 * one Docs page.
 *
 * Tagged `!test` — these mount editor source (a 2nd React copy under the Vitest
 * runner), so they are visual: browse them here.
 */
const meta = {
  title: "Editor/Deployment Diagram",
  tags: ["autodocs", "!test"],
  // The Docs page is the complete overview, but every story mounts a real
  // editor — rendering them all inline is slow. `inline: false` lazy-loads each
  // story in its own iframe (rendered on scroll), so the Docs page opens fast
  // while still showing everything.
  parameters: {
    docs: { story: { inline: false, height: "640px" } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Editor ───────────────────────────────────────────────────────────────────
/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.DeploymentDiagram} />,
}

/** Editable blank canvas — build a deployment diagram from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="DeploymentDiagram" />,
}

// ── Catalog ──────────────────────────────────────────────────────────────────
/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="DeploymentDiagram" />,
}

/** Every relationship (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="DeploymentDiagram" />,
}

// ── Edit popovers ────────────────────────────────────────────────────────────
/** Deployment-component node editor — name + component-header toggle. */
export const EditDeploymentComponent: Story = {
  name: "Edit: Component",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("component-1", "deploymentComponent", {
            name: "WebApp",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DeploymentComponentEditPopover elementId="component-1" />
    </SeededPopoverHarness>
  ),
}

/** Deployment-node editor — name, header toggle, and a stereotype field. */
export const EditDeploymentNode: Story = {
  name: "Edit: Node",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      seed={(diagram) =>
        diagram.getState().addNode(
          makeNode("node-1", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
      }
    >
      <DeploymentNodeEditPopover elementId="node-1" />
    </SeededPopoverHarness>
  ),
}

/** Association edge editor — line style, swap, edge type, label, connection info. */
export const EditDeploymentAssociation: Story = {
  name: "Edit: Association",
  parameters: { layout: "centered" },
  render: () => (
    <SeededPopoverHarness
      diagramType="DeploymentDiagram"
      width={360}
      seed={(diagram) => {
        diagram.getState().addNode(
          makeNode("source", "deploymentNode", {
            name: "ApplicationServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addNode(
          makeNode("target", "deploymentNode", {
            name: "DatabaseServer",
            stereotype: "«device»",
            isComponentHeaderShown: true,
          })
        )
        diagram.getState().addEdge(
          makeEdge("edge-1", "DeploymentAssociation", "source", "target", {
            label: "TCP/IP",
          })
        )
      }}
    >
      <DeploymentEdgeEditPopover elementId="edge-1" />
    </SeededPopoverHarness>
  ),
}
