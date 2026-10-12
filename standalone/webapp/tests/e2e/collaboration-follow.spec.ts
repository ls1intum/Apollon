import { expect, test, type Page } from "@playwright/test"

async function openPeer(page: Page) {
  await page.goto("/playground")
  await page.getByText("Collaboration viewport test", { exact: true }).click()
  await page.getByRole("button", { name: "Collapse test sidebar" }).click()
  await page
    .getByRole("button", { name: "Collapse theme configuration" })
    .click()
  await expect(page.locator(".react-flow__pane")).toBeVisible()
}

function viewport(page: Page) {
  return page.locator(".react-flow__viewport").evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
    return { x: matrix.e, y: matrix.f, zoom: matrix.a }
  })
}

async function wheelStep(page: Page, deltaY = 80) {
  await page.bringToFront()
  const bounds = await page.locator(".react-flow__pane").boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 120)
  await page.mouse.wheel(0, deltaY)
}

test("a single wheel step is followed and a follower's first step takes control back", async ({
  page: leader,
  context,
}) => {
  const follower = await context.newPage()
  await openPeer(leader)
  await openPeer(follower)
  await follower.getByRole("button", { name: /\(click to follow\)$/ }).click()

  const stopFollowing = follower.getByRole("button", {
    name: /^Stop following /,
  })
  await expect(stopFollowing).toBeVisible()
  await expect(leader.getByLabel(/You · followed by 1/)).toBeVisible()
  await expect.poll(() => viewport(follower)).toEqual(await viewport(leader))

  const initial = await viewport(leader)
  // No warm-up wheel: the first event takes React Flow's start-only path.
  await wheelStep(leader)
  await expect.poll(() => viewport(leader)).not.toEqual(initial)
  await expect.poll(() => viewport(follower)).toEqual(await viewport(leader))
  await expect(stopFollowing).toBeVisible()

  const beforeTakeBack = await viewport(follower)
  await wheelStep(follower)
  await expect.poll(() => viewport(follower)).not.toEqual(beforeTakeBack)
  await expect(stopFollowing).toBeHidden()
  await expect(
    follower.locator(".apollon-collaboration-follow-frame")
  ).toBeHidden()
  await expect(leader.getByLabel(/You · followed by 1/)).toBeHidden()

  const independent = await viewport(follower)
  const beforeLeaderStep = await viewport(leader)
  await wheelStep(leader, 140)
  await expect.poll(() => viewport(leader)).not.toEqual(beforeLeaderStep)
  expect(await viewport(leader)).not.toEqual(independent)
  for (const peer of [leader, follower]) {
    await peer.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
    )
  }
  expect(await viewport(follower)).toEqual(independent)
})

test("pressing without moving keeps follow active, but dragging cancels it", async ({
  page: leader,
  context,
}) => {
  const follower = await context.newPage()
  await openPeer(leader)
  await openPeer(follower)
  await follower.getByRole("button", { name: /\(click to follow\)$/ }).click()
  const stopFollowing = follower.getByRole("button", {
    name: /^Stop following /,
  })
  await expect(stopFollowing).toBeVisible()
  await expect.poll(() => viewport(follower)).toEqual(await viewport(leader))

  await follower.bringToFront()
  const bounds = await follower.locator(".react-flow__pane").boundingBox()
  const point = { x: bounds!.x + bounds!.width / 2, y: bounds!.y + 120 }
  await follower.mouse.move(point.x, point.y)
  await follower.mouse.down({ button: "middle" })
  await follower.mouse.up({ button: "middle" })
  await expect(stopFollowing).toBeVisible()

  await follower.mouse.down({ button: "middle" })
  try {
    await follower.mouse.move(point.x + 40, point.y + 40, { steps: 4 })
    await expect(stopFollowing).toBeHidden()
  } finally {
    await follower.mouse.up({ button: "middle" })
  }
})
