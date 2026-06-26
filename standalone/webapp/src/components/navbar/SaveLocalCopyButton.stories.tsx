import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import {
  DarkNavbarSurface,
  makeStubEditor,
  StubEditorContext,
} from "../../stories/_support/webapp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"

/**
 * The durability escape-hatch button shown only on the shared/collab editor
 * (`/shared/:id`). It self-hides unless ALL of: a diagram id is in the path, a
 * live editor is in context, and the pathname starts with `/shared/`. So these
 * stories drive the router to a `/shared/:id` entry (via the `tanstackRouter`
 * parameter) and inject a minimal editor stub into `EditorContext` — the only
 * thing the button reads off it is `editor.model`, on click.
 */

const meta = {
  title: "Webapp/Navbar/SaveLocalCopyButton",
  component: SaveLocalCopyButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    // The button only renders under `/shared/:id`.
    tanstackRouter: {
      initialEntry: "/shared/demo-diagram",
      routePaths: ["/shared/$id"],
    },
  },
  decorators: [
    DarkNavbarSurface,
    (Story) => (
      <StubEditorContext
        editor={makeStubEditor({ title: "Shared Diagram" })}
        diagramName="Shared Diagram"
      >
        <Story />
      </StubEditorContext>
    ),
  ],
  argTypes: {
    color: {
      control: "text",
      description: "Explicit foreground colour (themed mobile dropdown).",
      table: { category: "Appearance" },
    },
    iconOnly: {
      control: "boolean",
      description:
        "Icon-only presentation (always hides the label, always tooltips).",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof SaveLocalCopyButton>

export default meta
type Story = StoryObj<typeof meta>

/** The button as it appears in the desktop actions island. */
export const Default: Story = {}

/** Icon-only presentation (the editor mobile pill). */
export const IconOnly: Story = {
  args: { iconOnly: true },
}

/** On a non-shared route the button self-hides (renders nothing). */
export const HiddenOffShared: Story = {
  tags: ["test", "!autodocs", "!dev"],
  parameters: {
    tanstackRouter: { initialEntry: "/local/demo", routePaths: ["/local/$id"] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.queryByRole("button", { name: /save a local copy/i })
    ).toBeNull()
  },
}

/** The button is present and labelled on the shared route. */
export const VisibleOnShared: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /save a local copy/i })
    ).toBeInTheDocument()
  },
}
