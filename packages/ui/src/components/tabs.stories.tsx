import type { Meta, StoryObj } from "@storybook/react-vite"
import { BellIcon, SettingsIcon, UserIcon } from "lucide-react"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

/**
 * Tabbed navigation built on the Base UI `Tabs`. The `TabsList` `variant`
 * (`default` | `line`) switches between a filled segmented control and an
 * underlined indicator, while the root `orientation` (`horizontal` | `vertical`)
 * flips the layout. Activation follows roving focus, so arrow keys move between
 * tabs.
 */
const meta = {
  title: "UI/Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout axis of the tab list.",
    },
  },
  args: {
    orientation: "horizontal",
  },
  parameters: { layout: "padded" },
  render: (args) => (
    <Tabs {...args} defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage your account details.</TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
      <TabsContent value="team">Invite and manage teammates.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

/** Default (filled segmented) variant. */
export const Default: Story = {}

/** Line variant — underlined active indicator, transparent track. */
export const Line: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="account" className="w-96">
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage your account details.</TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
      <TabsContent value="team">Invite and manage teammates.</TabsContent>
    </Tabs>
  ),
}

export const Horizontal: Story = {
  args: { orientation: "horizontal" },
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Tabs {...args} defaultValue="account" className="w-[28rem]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage your account details.</TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
      <TabsContent value="team">Invite and manage teammates.</TabsContent>
    </Tabs>
  ),
}

/** A disabled tab is skipped by keyboard navigation and not selectable. */
export const DisabledTab: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password" disabled>
          Password
        </TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Manage your account details.</TabsContent>
      <TabsContent value="password">Change your password here.</TabsContent>
      <TabsContent value="team">Invite and manage teammates.</TabsContent>
    </Tabs>
  ),
}

/** Many tabs to check wrapping / overflow behaviour of the list. */
export const ManyTabs: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="t1" className="w-96">
      <TabsList className="flex-wrap">
        {Array.from({ length: 7 }, (_, i) => (
          <TabsTrigger key={i} value={`t${i + 1}`}>
            Tab {i + 1}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="t1">Content for tab 1.</TabsContent>
    </Tabs>
  ),
}

/** Triggers with leading icons (the `data-icon` slot tightens padding). */
export const WithIcons: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="profile" className="w-96">
      <TabsList>
        <TabsTrigger value="profile">
          <UserIcon data-icon="inline-start" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <BellIcon data-icon="inline-start" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="settings">
          <SettingsIcon data-icon="inline-start" />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">Your public profile.</TabsContent>
      <TabsContent value="notifications">Notification preferences.</TabsContent>
      <TabsContent value="settings">Application settings.</TabsContent>
    </Tabs>
  ),
}

/** default/line × horizontal/vertical grid for visual + dark review. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      {(["horizontal", "vertical"] as const).map((orientation) =>
        (["default", "line"] as const).map((variant) => (
          <div
            key={`${orientation}-${variant}`}
            className="flex flex-col gap-2"
          >
            <span className="text-xs text-muted-foreground">
              {orientation} · {variant}
            </span>
            <Tabs orientation={orientation} defaultValue="one">
              <TabsList variant={variant}>
                <TabsTrigger value="one">One</TabsTrigger>
                <TabsTrigger value="two">Two</TabsTrigger>
                <TabsTrigger value="three">Three</TabsTrigger>
              </TabsList>
              <TabsContent value="one">First panel.</TabsContent>
              <TabsContent value="two">Second panel.</TabsContent>
              <TabsContent value="three">Third panel.</TabsContent>
            </Tabs>
          </div>
        ))
      )}
    </div>
  ),
}

/**
 * Pinned dark-theme review of both list variants, focused on the `line`
 * variant's transparent track and active underline indicator on a dark surface.
 */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-8">
      {(["default", "line"] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{variant}</span>
          <Tabs defaultValue="account" className="w-96">
            <TabsList variant={variant}>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              Manage your account details.
            </TabsContent>
            <TabsContent value="password">
              Change your password here.
            </TabsContent>
            <TabsContent value="team">Invite and manage teammates.</TabsContent>
          </Tabs>
        </div>
      ))}
    </div>
  ),
}

/**
 * Roving focus: arrow keys move focus between tabs, and Enter activates the
 * focused tab (the list uses manual activation, `activateOnFocus={false}`).
 */
export const KeyboardNavigation: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("first tab is active on mount", async () => {
      const account = await canvas.findByRole("tab", { name: /account/i })
      await waitFor(() => {
        expect(account).toHaveAttribute("data-active")
      })
    })

    await step(
      "ArrowRight moves focus, Enter activates the next tab",
      async () => {
        const account = await canvas.findByRole("tab", { name: /account/i })
        account.focus()
        await userEvent.keyboard("{ArrowRight}")
        const password = await canvas.findByRole("tab", { name: /password/i })
        await waitFor(() => {
          expect(password).toHaveFocus()
        })
        await userEvent.keyboard("{Enter}")
        await waitFor(() => {
          expect(password).toHaveAttribute("data-active")
        })
      }
    )

    await step("ArrowLeft + Enter returns to the previous tab", async () => {
      await userEvent.keyboard("{ArrowLeft}{Enter}")
      const account = await canvas.findByRole("tab", { name: /account/i })
      await waitFor(() => {
        expect(account).toHaveAttribute("data-active")
      })
    })
  },
}
