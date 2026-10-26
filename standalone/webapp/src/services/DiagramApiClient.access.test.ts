import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  ApiError,
  DiagramApiClient,
  VersionApiClient,
} from "./DiagramApiClient"
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
      writeToken: "header.writer.sig",
    })
  )
  vi.stubGlobal("fetch", fetch)
  history.replaceState(null, "", "/shared/abc#access=header.writer.sig")
  const diagram = await DiagramApiClient.fetchDiagram("abc")
  expect(authorizationOf(fetch.mock.calls[0]!)).toBe("Bearer header.writer.sig")
  expect(diagram).not.toHaveProperty("writeToken")
  history.replaceState(null, "", "/")
  expect(getSharedDiagramWriteToken("abc")).toBe("header.writer.sig")
  expect(getSharedDiagramWriteToken("other")).toBeUndefined()
})

it("keeps the shared gallery order stable when it reloads writable shares", async () => {
  addSharedDiagramEntry("a", { writeToken: "header.a.sig" })
  addSharedDiagramEntry("b", { writeToken: "header.b.sig" })
  const before = getSharedDiagramEntries()
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const id = url.split("/").at(-1)!
      return json({ id, nodes: [], edges: [], writeToken: `header.${id}.sig` })
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
  addSharedDiagramEntry("abc", { writeToken: "header.revoked-cache.sig" })
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
    "Bearer header.revoked-cache.sig",
    undefined,
  ])
  expect(getSharedDiagramWriteToken("abc")).toBeUndefined()
  expect(getSharedDiagramEntries().map((entry) => entry.id)).toEqual(["abc"])
})

it("ignores a revoked link capability for the rest of the page session", async () => {
  history.replaceState(
    null,
    "",
    "/shared/abc?view=EDIT#access=header.revoked-link.sig"
  )
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
    "Bearer header.revoked-link.sig",
    undefined,
    undefined,
  ])
})

it("does not retry a write with a revoked capability", async () => {
  addSharedDiagramEntry("abc", { writeToken: "header.revoked-write.sig" })
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

it("loads a diagram whose link carries a malformed capability", async () => {
  history.replaceState(null, "", "/shared/abc?view=EDIT#access=a%0Ab")
  // `new Headers` applies the same header-value check as the browser's fetch.
  const fetch = vi.fn((_url: string, init: RequestInit) => {
    new Headers(init.headers)
    return Promise.resolve(json({ id: "abc", nodes: [], edges: [] }))
  })
  vi.stubGlobal("fetch", fetch)
  await expect(DiagramApiClient.fetchDiagram("abc")).resolves.toEqual(
    expect.objectContaining({ id: "abc" })
  )
  expect(authorizationOf(fetch.mock.calls[0]!)).toBeUndefined()
})

it("never puts the write capability into a version permalink", () => {
  addSharedDiagramEntry("abc", { writeToken: "header.writer.sig" })
  history.replaceState(
    null,
    "",
    "/shared/abc?view=COLLABORATE#access=header.writer.sig"
  )
  const link = new URL(VersionApiClient.permalink("abc", "v1"))
  expect(link.hash).toBe("")
  expect(link.href).not.toContain("header.writer.sig")
  expect(link.searchParams.get("view")).toBe("COLLABORATE")
  expect(link.searchParams.get("version")).toBe("v1")
})
