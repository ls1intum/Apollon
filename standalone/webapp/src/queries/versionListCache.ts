import type { VersionSummary } from "@/types"
import type { VersionListData } from "./versionQueries"

/**
 * Pure transforms over the cached infinite list, used by the mutation hooks
 * and the WS control-event bridge. They never touch page cursors, so
 * pagination chains stay intact.
 */

export function patchVersionInList(
  data: VersionListData | undefined,
  versionId: string,
  patch: Partial<VersionSummary>
): VersionListData | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      versions: page.versions.map((v) =>
        v.id === versionId ? { ...v, ...patch } : v
      ),
    })),
  }
}

export function replaceVersionInList(
  data: VersionListData | undefined,
  updated: VersionSummary
): VersionListData | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      versions: page.versions.map((v) => (v.id === updated.id ? updated : v)),
    })),
  }
}

export function removeVersionFromList(
  data: VersionListData | undefined,
  versionId: string
): VersionListData | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      versions: page.versions.filter((v) => v.id !== versionId),
    })),
  }
}

export function listContainsVersion(
  data: VersionListData | undefined,
  versionId: string
): boolean {
  return Boolean(
    data?.pages.some((page) => page.versions.some((v) => v.id === versionId))
  )
}
