import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { ApiError, DiagramApiClient } from "./DiagramApiClient"
import {
  addSharedDiagramEntry,
  getSharedDiagramEntries,
  getSharedDiagramWriteToken,
  subscribeToSharedDiagramChange,
} from "@/utils/sharedDiagramStorage"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const invalidCapability = () =>
  json(
    {
      error: "INVALID_CAPABILITY",
      message: "Invalid write capability",
      requestId: "",
    },
    401
  )

const authorizationOf = (call: unknown[]) =>
  (call[1] as RequestInit & { headers: Record<string, string> }).headers
    .Authorization

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, "", "/")
})

it("stores a received write capability outside the model and scopes request authorization to its diagram", async () => {
  const fetch = vi.fn().mockResolvedValue(
    json({
      id: "abc",
      nodes: [],
      edges: [],
      canWrite: true,
      writeToken: "writer-token",
    })
  )
  vi.stubGlobal("fetch", fetch)
  history.replaceState(null, "", "/shared/abc#access=writer-token")
  const diagram = await DiagramApiClient.fetchDiagram("abc")
  expect(authorizationOf(fetch.mock.calls[0]!)).toBe("Bearer writer-token")
  expect(diagram).not.toHaveProperty("writeToken")
  history.replaceState(null, "", "/")
  expect(getSharedDiagramWriteToken("abc")).toBe("writer-token")
  expect(getSharedDiagramWriteToken("other")).toBeUndefined()
})

it("keeps the shared gallery order stable when it reloads writable shares", async () => {
  addSharedDiagramEntry("a", { writeToken: "token-a" })
  addSharedDiagramEntry("b", { writeToken: "token-b" })
  const before = getSharedDiagramEntries()
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const id = url.split("/").at(-1)!
      return json({ id, nodes: [], edges: [], writeToken: `token-${id}` })
    })
  )
  const changed = vi.fn()
  const unsubscribe = subscribeToSharedDiagramChange(changed)
  try {
    await DiagramApiClient.fetchStoredDiagram("a")
    await DiagramApiClient.fetchStoredDiagram("b")
  } finally {
    unsubscribe()
  }
  expect(changed).not.toHaveBeenCalled()
  expect(getSharedDiagramEntries()).toEqual(before)
})

it("drops a revoked cached capability and reads the diagram without it", async () => {
  addSharedDiagramEntry("abc", { writeToken: "revoked-cache" })
  const fetch = vi.fn((_url: string, init: RequestInit) =>
    Promise.resolve(
      (init.headers as Record<string, string>).Authorization
        ? invalidCapability()
        : json({ id: "abc", nodes: [], edges: [], canWrite: false })
    )
  )
  vi.stubGlobal("fetch", fetch)
  await expect(DiagramApiClient.fetchStoredDiagram("abc")).resolves.toEqual(
    expect.objectContaining({ id: "abc", canWrite: false })
  )
  expect(fetch.mock.calls.map(authorizationOf)).toEqual([
    "Bearer revoked-cache",
    undefined,
  ])
  expect(getSharedDiagramWriteToken("abc")).toBeUndefined()
  expect(getSharedDiagramEntries().map((entry) => entry.id)).toEqual(["abc"])
})

it("ignores a revoked link capability for the rest of the page session", async () => {
  history.replaceState(null, "", "/shared/abc?view=EDIT#access=revoked-link")
  const fetch = vi.fn((_url: string, init: RequestInit) =>
    Promise.resolve(
      (init.headers as Record<string, string>).Authorization
        ? invalidCapability()
        : json({ id: "abc", nodes: [], edges: [] })
    )
  )
  vi.stubGlobal("fetch", fetch)
  await DiagramApiClient.fetchDiagram("abc")
  await DiagramApiClient.fetchDiagram("abc")
  expect(fetch.mock.calls.map(authorizationOf)).toEqual([
    "Bearer revoked-link",
    undefined,
    undefined,
  ])
})

it("does not retry a write with a revoked capability", async () => {
  addSharedDiagramEntry("abc", { writeToken: "revoked-write" })
  const fetch = vi.fn().mockResolvedValue(invalidCapability())
  vi.stubGlobal("fetch", fetch)
  await expect(
    DiagramApiClient.sendDiagramUpdate("abc", {
      nodes: [],
      edges: [],
    } as never)
  ).rejects.toEqual(expect.any(ApiError))
  expect(fetch).toHaveBeenCalledOnce()
  expect(getSharedDiagramWriteToken("abc")).toBeUndefined()
})
