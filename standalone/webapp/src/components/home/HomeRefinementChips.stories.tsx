import { useEffect, useRef } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
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
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ChipsHarness>

export default meta
type Story = StoryObj<typeof meta>

/** Several active refinements → one removable chip each + "Clear all". */
export const Active: Story = {
  args: { seeded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /remove favorites filter/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /clear all/i })
    ).toBeInTheDocument()
  },
}

/** Nothing active → the line renders nothing. */
export const Empty: Story = {
  args: { seeded: false },
}

export const Dark: Story = {
  args: { seeded: true },
  globals: { theme: "dark" },
}
