import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "./skeleton"

/**
 * Pulsing placeholder for content that is still loading. A single `<div>` with
 * `animate-pulse`, a muted background, and a rounded corner — shape and size are
 * driven entirely by the `className` you pass (width/height/radius).
 */
const meta = {
  title: "UI/Components/Skeleton",
  component: Skeleton,
  args: {
    className: "h-4 w-48",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

/** A single text line. */
export const Line: Story = {}

/** A circular avatar placeholder. */
export const Circle: Story = {
  args: { className: "size-12 rounded-full" },
}

/** A card-shaped composite: image, title, and two text lines. */
export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
}

/** A multi-line paragraph block with a short trailing line. */
export const Paragraph: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  ),
}

/** Pinned dark to verify the muted background reads against a dark surface. */
export const Dark: Story = {
  parameters: {
    themes: { themeOverride: "dark" },
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="flex items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  ),
}
