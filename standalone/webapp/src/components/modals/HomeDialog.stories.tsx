import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import {
  HomeDialogActions,
  HomeDialogContent,
  HomeDialogField,
  HomeDialogNotice,
  HomeDialogOptionGroup,
  HomeDialogTextInput,
  HomeDialogValueBox,
} from "./HomeDialog"

/**
 * The presentational building blocks for the "home" dialog variant: a vertical
 * `HomeDialogContent` shell plus notices, labelled fields, text inputs, readonly
 * value boxes, single-select option groups, and a cancel/confirm action bar.
 * All are pure-props — they read no context — so each is shown standalone.
 */
const meta = {
  title: "Webapp/Modals/HomeDialog",
  component: HomeDialogContent,
  // Render-only stories compose the building blocks inside `render`; this
  // satisfies HomeDialogContent's required `children` for `satisfies Meta`.
  args: { children: null },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="recent-diagrams-font w-[420px] rounded-lg border border-border bg-card p-5">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof HomeDialogContent>

export default meta
type Story = StoryObj<typeof meta>

/** Stable spies for the composed form so the play test can assert the click. */
const composedActions = { onCancel: fn(), onConfirm: fn() }

/** A composed dialog body using most of the blocks together. */
export const Composed: Story = {
  render: () => {
    const Demo = () => {
      const [name, setName] = useState("Untitled diagram")
      const [layout, setLayout] = useState("grid")
      return (
        <HomeDialogContent>
          <HomeDialogNotice>
            This will create a copy in your local workspace.
          </HomeDialogNotice>
          <HomeDialogField label="Diagram name" htmlFor="hd-name">
            <HomeDialogTextInput
              id="hd-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </HomeDialogField>
          <HomeDialogField label="Owner">
            <HomeDialogValueBox>you@example.com</HomeDialogValueBox>
          </HomeDialogField>
          <HomeDialogOptionGroup
            label="Layout"
            value={layout}
            onChange={setLayout}
            columns={2}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
          />
          <HomeDialogActions
            confirmLabel="Create"
            onCancel={composedActions.onCancel}
            onConfirm={composedActions.onConfirm}
          />
        </HomeDialogContent>
      )
    }
    return <Demo />
  },
  play: async ({ canvasElement }) => {
    composedActions.onConfirm.mockClear()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /create/i }))
    await expect(composedActions.onConfirm).toHaveBeenCalled()
  },
}

/** A standalone notice/callout block. */
export const Notice: Story = {
  render: () => (
    <HomeDialogContent>
      <HomeDialogNotice>
        Saved versions are kept for 30 days before older auto-saves are pruned.
      </HomeDialogNotice>
    </HomeDialogContent>
  ),
}

/** A labelled field wrapping a text input, plus a readonly value box. */
export const Fields: Story = {
  render: () => (
    <HomeDialogContent>
      <HomeDialogField label="Title" htmlFor="hd-title">
        <HomeDialogTextInput id="hd-title" placeholder="Enter a title" />
      </HomeDialogField>
      <HomeDialogField label="Created">
        <HomeDialogValueBox>16 Jun 2026</HomeDialogValueBox>
      </HomeDialogField>
    </HomeDialogContent>
  ),
}

/** Single-select option group in one- and two-column layouts. */
export const OptionGroups: Story = {
  render: () => {
    const Demo = () => {
      const [single, setSingle] = useState("a")
      const [grid, setGrid] = useState("class")
      return (
        <HomeDialogContent>
          <HomeDialogOptionGroup
            label="Visibility"
            value={single}
            onChange={setSingle}
            options={[
              { value: "a", label: "Private" },
              { value: "b", label: "Shared" },
            ]}
          />
          <HomeDialogOptionGroup
            label="Diagram type"
            value={grid}
            onChange={setGrid}
            columns={2}
            options={[
              { value: "class", label: "Class" },
              { value: "object", label: "Object" },
              { value: "activity", label: "Activity" },
              { value: "usecase", label: "Use case" },
            ]}
          />
        </HomeDialogContent>
      )
    }
    return <Demo />
  },
}

/** The action bar in its default and loading states. */
export const Actions: Story = {
  render: () => (
    <HomeDialogContent>
      <HomeDialogActions confirmLabel="Save" onCancel={fn()} onConfirm={fn()} />
      <HomeDialogActions
        confirmLabel="Save"
        loadingLabel="Saving..."
        loading
        onCancel={fn()}
        onConfirm={fn()}
      />
    </HomeDialogContent>
  ),
}
