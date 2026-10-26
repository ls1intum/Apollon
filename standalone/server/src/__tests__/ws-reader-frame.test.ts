// @vitest-environment jsdom
import { expect, it } from "vitest"
import { ApollonEditor } from "@tumaet/apollon"
import { READER_FRAME } from "../ws.js"

it("accepts exactly the presence request that the library sends for readers", () => {
  expect(READER_FRAME).toBe(
    JSON.stringify({
      diagramData: ApollonEditor.generateInitialAwarenessSyncMessage(),
    })
  )
})
