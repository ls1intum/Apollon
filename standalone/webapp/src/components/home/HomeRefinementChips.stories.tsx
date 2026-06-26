import { useEffect, useRef } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { HomeRefinementChips } from "./HomeRefinementChips"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The removable-chip line under the band. One chip per active refinement, each
 * with an inline "×", plus a trailing "Clear all". Hidden when nothing is active.
 */

function ChipsHarness({ seeded }: { seeded?: boolean }) {
  const chrome = useHomeChrome()
  const ref = useRef(false)

  useEffect(() => {
    if (!seeded || ref.current) return
    ref.current = true
    chrome.setFavoritesOnly(true)
    chrome.setSource("shared")
    chrome.setType("ClassDiagram")
    chrome.setSortField("alphabetical")
  }, [seeded, chrome])

  return (
    <div className="bg-[var(--apollon-chrome-surface)] p-4">
      <HomeRefinementChips chrome={chrome} />
    </div>
  )
}

const meta = {
  title: "Webapp/Home/HomeRefinementChips",
  component: ChipsHarness,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ChipsHarness>

export default meta
type Story = StoryObj<typeof meta>

/** Several active refinements → one removable chip each + "Clear all". */
export const Active: Story = {
  args: { seeded: true },
}

/** Nothing active → the line renders nothing. */
export const Empty: Story = {
  args: { seeded: false },
}

/** Removing a single chip clears only that facet; the others stay. */
export const RemovesSingleChip: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { seeded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: /remove favorites filter/i })
    )
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: /remove favorites filter/i })
      ).not.toBeInTheDocument()
    )
    // The Shared source chip survives the targeted removal.
    await expect(
      canvas.getByRole("button", { name: /remove shared filter/i })
    ).toBeInTheDocument()
  },
}

/** "Clear all" resets every facet, so the whole line unmounts. */
export const ClearAllResets: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { seeded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: /clear all/i })
    )
    await waitFor(() =>
      expect(
        canvas.queryByRole("group", { name: /active filters/i })
      ).not.toBeInTheDocument()
    )
  },
}

/** Dark theme — the chip plate paints themed glass + flips text/border. */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: { seeded: true },
  globals: { theme: "dark" },
}
