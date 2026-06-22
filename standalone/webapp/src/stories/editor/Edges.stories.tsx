import type { Meta, StoryObj } from "@storybook/react-vite"
import { EdgePreview, edgeTypeCatalog } from "../_support/editor"

/**
 * Every edge (relationship) type the editor can draw, rendered as the editor's
 * own faithful mini-preview (the same markers + dash patterns the canvas uses).
 * Browse here to verify each connector — arrowheads, diamonds, triangles,
 * interface sockets, dashed vs solid — looks correct.
 */
const meta = {
  title: "Editor/Edges",
  component: EdgePreview,
  parameters: { layout: "centered" },
  // Visual-only: EdgeTypePreviewIcon imports editor source (a second React copy
  // under the Vitest browser runner). Browse it in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta<typeof EdgePreview>

export default meta
type Story = StoryObj<typeof meta>

const families = [...new Set(edgeTypeCatalog.map((e) => e.family))]

function Grid({ family }: { family?: string }) {
  const items = family
    ? edgeTypeCatalog.filter((e) => e.family === family)
    : edgeTypeCatalog
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
        alignItems: "start",
      }}
    >
      {items.map((e) => (
        <div
          key={`${e.family}-${e.key}`}
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

/** Every edge type across all diagram families. */
export const AllEdges: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, width: 760 }}
    >
      {families.map((family) => (
        <section key={family}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--home-text-secondary)",
            }}
          >
            {family}
          </h3>
          <Grid family={family} />
        </section>
      ))}
    </div>
  ),
}

/** The same gallery pinned to the dark theme. */
export const AllEdgesDark: Story = {
  ...AllEdges,
  globals: { theme: "dark" },
}

// Per-family stories for focused browsing.
export const ClassDiagram: Story = {
  render: () => <Grid family="ClassDiagram" />,
}
export const UseCaseDiagram: Story = {
  render: () => <Grid family="UseCaseDiagram" />,
}
export const ComponentDiagram: Story = {
  render: () => <Grid family="ComponentDiagram" />,
}
export const DeploymentDiagram: Story = {
  render: () => <Grid family="DeploymentDiagram" />,
}
export const BPMN: Story = { render: () => <Grid family="BPMN" /> }
