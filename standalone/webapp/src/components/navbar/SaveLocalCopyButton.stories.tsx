import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import type { UMLModel } from "@tumaet/apollon"
import type { ApollonEditor } from "@tumaet/apollon/react"
import { EditorContext } from "@/contexts/EditorContext"
import { ModalProvider } from "@/contexts/ModalContext"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"

/**
 * The durability escape-hatch button shown only on the shared/collab editor
 * (`/shared/:id`). It self-hides unless ALL of: a diagram id is in the path, a
 * live editor is in context, and the pathname starts with `/shared/`. So these
 * stories drive the router to a `/shared/:id` entry (via the `tanstackRouter`
 * parameter) and inject a minimal editor stub into `EditorContext` — the only
 * thing the button reads off it is `editor.model`, on click.
 */

const STUB_MODEL = {
  version: "4.0.0",
  type: "ClassDiagram",
  title: "Shared Diagram",
  nodes: [],
  edges: [],
} as unknown as UMLModel

/** A throwaway editor stub: the button only needs a truthy `editor.model`. */
const stubEditor = { model: STUB_MODEL } as unknown as ApollonEditor

/** Supplies the editor stub + a modal host on top of the global router. */
function SharedEditorContext({ children }: { children: ReactNode }) {
  return (
    <EditorContext.Provider
      value={{
        editor: stubEditor,
        diagramName: "Shared Diagram",
        setDiagramName: () => {},
        setEditor: () => {},
      }}
    >
      <ModalProvider>{children}</ModalProvider>
    </EditorContext.Provider>
  )
}

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
      <SharedEditorContext>
        <Story />
      </SharedEditorContext>
    ),
  ],
  argTypes: {
    color: {
      control: "text",
      description: "Explicit foreground colour (themed mobile dropdown).",
      table: { category: "Appearance" },
    },
    labelClassName: {
      control: "text",
      description: "Label-span classes (e.g. `hidden lg:inline`).",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof SaveLocalCopyButton>

export default meta
type Story = StoryObj<typeof meta>

/** The button as it appears in the desktop actions island. */
export const Default: Story = {}

/** Collapsed to the icon at tight widths (the bar passes `hidden lg:inline`). */
export const IconOnly: Story = {
  args: { labelClassName: "hidden" },
}

/** Pinned dark for visual review on the dark token set. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/** On a non-shared route the button self-hides (renders nothing). */
export const HiddenOffShared: Story = {
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /save a local copy/i })
    ).toBeInTheDocument()
  },
}
