import type { Meta, StoryObj } from "@storybook/react-vite"
import { Apollon, ApollonMode } from "@tumaet/apollon/react"
import type { UMLDiagramType } from "@tumaet/apollon"
import {
  editorStoryMeta,
  diagramFixtures,
  fixtureByType,
} from "../_support/editor"

// The Storybook embodiment of the `/playground` page's mode/type exploration:
// a single editor driven entirely by Storybook controls. Collaboration, the
// test sidebars, exports, and the backend wiring are intentionally NOT ported —
// that live harness stays on the `/playground` route.

const diagramTypeOptions = diagramFixtures.map((f) => f.key)
const modeOptions = Object.values(ApollonMode)

interface PlaygroundArgs {
  /** ApollonMode — the prop the `/playground` page drives the editor with. */
  mode: ApollonMode
  /**
   * Reactive readonly toggle. In Assessment mode this flips the editor between
   * the give-feedback workflow (off) and the see-feedback review surface (on).
   */
  readonly: boolean
  /** Which sample diagram to load. Changing it re-mounts the editor. */
  diagramType: UMLDiagramType
}

const meta = {
  title: "Editor/Playground",
  ...editorStoryMeta,
  parameters: {
    ...editorStoryMeta.parameters,
    layout: "fullscreen",
    docs: {
      ...editorStoryMeta.parameters.docs,
      description: {
        component:
          "Controls-driven editor for exploring the editor's mode (Modelling / " +
          "Assessment / Exporting), the readonly flag, and the diagram type — " +
          "the Storybook counterpart of the `/playground` page's mode/type " +
          "exploration. The live collaboration / test-sidebar harness (cursors, " +
          "presence, backend wiring) stays on the `/playground` route and is not " +
          "ported here.",
      },
    },
  },
  argTypes: {
    mode: {
      control: "select",
      options: modeOptions,
      description: "ApollonMode the editor runs in.",
    },
    readonly: {
      control: "boolean",
      description:
        "Reactive readonly flag (Assessment: give vs. see feedback).",
    },
    diagramType: {
      control: "select",
      options: diagramTypeOptions,
      description: "Sample diagram to load (re-mounts the editor).",
    },
  },
  args: {
    mode: ApollonMode.Modelling,
    readonly: false,
    diagramType: "ClassDiagram",
  },
} satisfies Meta<PlaygroundArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * One editor, fully controls-driven. `defaultModel` is snapshotted on mount, so
 * the `key` re-mounts the editor when the diagram type changes; `mode` and
 * `readonly` are reactive props and apply live without a re-mount.
 */
export const Playground: Story = {
  render: (args) => (
    <Apollon
      key={args.diagramType}
      defaultModel={fixtureByType[args.diagramType]}
      mode={args.mode}
      readonly={args.readonly}
      enablePopups
      style={{ height: "100vh", width: "100%" }}
    />
  ),
}
