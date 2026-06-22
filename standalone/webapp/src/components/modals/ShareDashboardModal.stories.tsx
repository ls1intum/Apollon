import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import {
  makeModel,
  makePersistentEntity,
} from "../../stories/_support/persistence"
import { ShareDashboardModal } from "./ShareDashboardModal"

/**
 * Body of the home "Share" dashboard modal. Given a `modelId`, it pre-fills the
 * diagram name from the local store and offers a "Create" action that uploads a
 * snapshot. The API is only called on submit — these stories render the initial
 * form (name field + create button) without creating anything.
 */

const SHARE_MODEL_ID = "share-dashboard-model"

const shareEntity = makePersistentEntity({
  model: makeModel({
    id: SHARE_MODEL_ID,
    title: "Banking Domain Model",
    type: "ClassDiagram",
    withContent: false,
  }),
})

const meta = {
  title: "Webapp/Modals/ShareDashboardModal",
  component: ShareDashboardModal,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
  args: { modelId: SHARE_MODEL_ID },
  beforeEach: () => {
    usePersistenceModelStore.setState({
      models: { [SHARE_MODEL_ID]: shareEntity },
      currentModelId: SHARE_MODEL_ID,
    })
  },
} satisfies Meta<typeof ShareDashboardModal>

export default meta
type Story = StoryObj<typeof meta>

/** Initial form with the diagram name pre-filled from the local store. */
export const Default: Story = {}

/** Editing the share name updates the field that gets uploaded on submit. */
export const RenameBeforeShare: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("the name is pre-filled", async () => {
      const name = canvas.getByLabelText("Name")
      await expect(name).toHaveValue("Banking Domain Model")
    })

    await step("rename before sharing", async () => {
      const name = canvas.getByLabelText("Name")
      await userEvent.clear(name)
      await userEvent.type(name, "Banking Domain Model (Shared)")
      await expect(name).toHaveValue("Banking Domain Model (Shared)")
    })
  },
}
