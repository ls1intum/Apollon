import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { DiagramApiClient } from "./DiagramApiClient"
import { getSharedDiagramWriteToken } from "@/utils/sharedDiagramStorage"

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, "", "/")
})

it("stores a received write capability outside the model and scopes request authorization to its diagram", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "abc",
        nodes: [],
        edges: [],
        canWrite: true,
        writeToken: "writer-token",
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  )
  vi.stubGlobal("fetch", fetch)
  history.replaceState(null, "", "/shared/abc#access=writer-token")
  const diagram = await DiagramApiClient.fetchDiagram("abc")
  expect(fetch.mock.calls[0]![1].headers.Authorization).toBe(
    "Bearer writer-token"
  )
  expect(diagram).not.toHaveProperty("writeToken")
  history.replaceState(null, "", "/")
  expect(getSharedDiagramWriteToken("abc")).toBe("writer-token")
  expect(getSharedDiagramWriteToken("other")).toBeUndefined()
})
