import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { EmbedSnippetPanel } from "./EmbedSnippetPanel"

/**
 * The embed panel for the share modal: a format picker (Markdown / Markdown
 * no-link / iframe) plus a read-only snippet field with a copy button. With a
 * shared `diagramId` it builds the three snippets against the resolved server
 * origin and shows a per-format hint; without one it falls back to a
 * "share the diagram first" line.
 *
 * It only reads `react-toastify` (copy feedback), so no context provider is
 * needed — the decorator just mounts a `ToastContainer` for the copy toast.
 */

const meta = {
  title: "Webapp/Modals/EmbedSnippetPanel",
  component: EmbedSnippetPanel,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[28rem] rounded-md bg-[var(--apollon-background)] p-4">
        <Story />
        <ToastContainer aria-label="Notifications" position="bottom-center" />
      </div>
    ),
  ],
  args: {
    diagramId: "8f2c-demo",
    title: "Order Processing",
  },
  argTypes: {
    diagramId: {
      control: "text",
      description:
        "Server id of a shared diagram; omit to show the share-first hint.",
      table: { category: "Data" },
    },
    title: {
      control: "text",
      description: "Diagram title used in the Markdown alt text.",
      table: { category: "Data" },
    },
  },
} satisfies Meta<typeof EmbedSnippetPanel>

export default meta
type Story = StoryObj<typeof meta>

/** A shared diagram — the format tabs and the Markdown snippet. */
export const Shared: Story = {}

/** No shared id yet — the "share the diagram to embed it" fallback. */
export const NotShared: Story = {
  args: { diagramId: undefined },
}

/** Switching to the iframe tab swaps the snippet to an `<iframe …>` string. */
export const SwitchFormat: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("tab", { name: /^iframe$/i }))
    const field = canvas.getByLabelText<HTMLInputElement>(/^embed code$/i)
    await expect(field.value).toContain("<iframe")
  },
}

/** Copying reports success via a toast. */
export const CopySnippet: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The browser test runner doesn't grant clipboard permission, so the real
    // `navigator.clipboard.writeText` rejects (document not focused) and the
    // component would surface the error toast. Stub the write to resolve so we
    // exercise the success path the story documents.
    const original = navigator.clipboard?.writeText
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
      configurable: true,
    })
    try {
      await userEvent.click(
        canvas.getByRole("button", { name: /copy embed code/i })
      )
      const body = within(canvasElement.ownerDocument.body)
      await expect(
        await body.findByText(/embed code copied/i)
      ).toBeInTheDocument()
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: original ? { writeText: original } : undefined,
        configurable: true,
      })
    }
  },
}
