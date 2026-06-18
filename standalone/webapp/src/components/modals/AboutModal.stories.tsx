import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { AboutModal } from "./AboutModal"

/**
 * The "About" modal body: a short blurb, the app + library versions, and links
 * to GitHub, releases, and the license. It reads `useModalContext` for its Close
 * button, so it is wrapped in `ModalBodyProviders`.
 */
const meta = {
  title: "Webapp/Modals/AboutModal",
  component: AboutModal,
  parameters: { layout: "centered" },
  decorators: [
    ModalBodyProviders,
    (Story) => (
      <div className="w-[420px] rounded-lg border border-border bg-card p-5">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof AboutModal>

export default meta
type Story = StoryObj<typeof meta>

/** The about content with its external links. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const github = await canvas.findByRole("link", { name: /^github$/i })
    await expect(github).toHaveAttribute("target", "_blank")
    await expect(
      canvas.getByRole("link", { name: /license \(mit\)/i })
    ).toBeInTheDocument()
  },
}

/** Pinned dark to verify the link palette and version list on dark. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
