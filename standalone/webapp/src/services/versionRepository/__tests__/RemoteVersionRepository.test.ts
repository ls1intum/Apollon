import { describe, expect, it, vi } from "vitest"
import { RemoteVersionRepository } from "../RemoteVersionRepository"
import type { VersionRepository } from "../types"
import { VersionApiClient } from "@/services/DiagramApiClient"

// Type-widen for the negative-presence assertions: the literal type
// narrows optional methods away when they're not implemented; the
// interface keeps them, so we assert against the contract shape.
const repoAsContract: VersionRepository = RemoteVersionRepository

/**
 * Pin the wire contract: every method delegates to `VersionApiClient` so
 * the `satisfies VersionRepository` refactor doesn't silently break the
 * collab path.
 */

const DIAGRAM_ID = "diagram-1"
const VERSION_ID = "version-1"
const fakeBody = { id: DIAGRAM_ID, nodes: [], edges: [], version: "4.0.0" }

describe("RemoteVersionRepository", () => {
  it("kind is 'remote'", () => {
    expect(RemoteVersionRepository.kind).toBe("remote")
  })

  it("delegates list to VersionApiClient", async () => {
    const spy = vi
      .spyOn(VersionApiClient, "list")
      .mockResolvedValue({ versions: [], total: 0 })
    await RemoteVersionRepository.list(DIAGRAM_ID, { limit: 10 })
    expect(spy).toHaveBeenCalledWith(DIAGRAM_ID, { limit: 10 })
    spy.mockRestore()
  })

  it("delegates create to VersionApiClient", async () => {
    const spy = vi.spyOn(VersionApiClient, "create").mockResolvedValue({
      id: VERSION_ID,
      diagramId: DIAGRAM_ID,
      name: "v",
      description: "",
      createdAt: new Date().toISOString(),
      kind: "user",
      librarySchemaVersion: "4.0.0",
    })
    await RemoteVersionRepository.create(DIAGRAM_ID, fakeBody as never, {
      name: "v",
    })
    expect(spy).toHaveBeenCalledWith(DIAGRAM_ID, fakeBody, { name: "v" })
    spy.mockRestore()
  })

  it("delegates getBody, restore, editInfo, delete, permalink", async () => {
    const getBody = vi
      .spyOn(VersionApiClient, "getBody")
      .mockResolvedValue(fakeBody as never)
    const restore = vi.spyOn(VersionApiClient, "restore").mockResolvedValue({
      headRev: 1,
      updatedAt: new Date().toISOString(),
      autoSnapshotVersionId: "auto",
    })
    const editInfo = vi.spyOn(VersionApiClient, "editInfo").mockResolvedValue({
      id: VERSION_ID,
      diagramId: DIAGRAM_ID,
      name: "n",
      description: "d",
      createdAt: new Date().toISOString(),
      kind: "user",
      librarySchemaVersion: "4.0.0",
    })
    const delSpy = vi
      .spyOn(VersionApiClient, "delete")
      .mockResolvedValue(undefined)
    const permaSpy = vi
      .spyOn(VersionApiClient, "permalink")
      .mockReturnValue("https://x/d/v")

    await RemoteVersionRepository.getBody(DIAGRAM_ID, VERSION_ID)
    await RemoteVersionRepository.restore(DIAGRAM_ID, VERSION_ID, {
      currentBody: fakeBody as never,
    })
    await RemoteVersionRepository.editInfo(DIAGRAM_ID, VERSION_ID, {
      name: "n",
    })
    await RemoteVersionRepository.delete(DIAGRAM_ID, VERSION_ID)
    expect(RemoteVersionRepository.permalink(DIAGRAM_ID, VERSION_ID)).toBe(
      "https://x/d/v"
    )

    expect(getBody).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID, undefined)
    expect(restore).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID, {
      currentBody: fakeBody,
    })
    expect(editInfo).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID, { name: "n" })
    expect(delSpy).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID)
    expect(permaSpy).toHaveBeenCalledWith(DIAGRAM_ID, VERSION_ID)

    getBody.mockRestore()
    restore.mockRestore()
    editInfo.mockRestore()
    delSpy.mockRestore()
    permaSpy.mockRestore()
  })

  it("does NOT implement requestPersistence (remote storage is server-managed)", () => {
    expect(repoAsContract.requestPersistence).toBeUndefined()
  })

  it("does NOT implement purgeDiagram (server cascades on DELETE diagram)", () => {
    expect(repoAsContract.purgeDiagram).toBeUndefined()
  })
})
