import type { QueryClient } from "@tanstack/react-query"
import type { ControlEvent } from "@/types"
import { log } from "@/logger"
import { versionKeys } from "./keys"
import type { VersionListData } from "./versionQueries"
import {
  listContainsVersion,
  patchVersionInList,
  removeVersionFromList,
} from "./versionListCache"

/**
 * WS control events → query-cache reconciliation (remote mode only). This is
 * the only place peer version activity touches the cache; the page keeps its
 * own `VERSION_RESTORED` branch for the editor-model refetch, which needs the
 * live editor instance.
 */
export function applyControlEventToCache(
  queryClient: QueryClient,
  diagramId: string,
  event: ControlEvent
): void {
  const listKey = versionKeys.list("remote", diagramId)
  switch (event.type) {
    case "VERSION_CREATED": {
      // Skip when the row is already cached — i.e. our own create's
      // settle-time refetch has landed, or a peer's event arrived twice.
      // Otherwise (including the common case where our event beats our own
      // refetch) invalidate; concurrent invalidations dedupe.
      const data = queryClient.getQueryData<VersionListData>(listKey)
      if (listContainsVersion(data, event.versionId)) return
      void queryClient.invalidateQueries({ queryKey: listKey })
      return
    }
    case "VERSION_DELETED": {
      queryClient.setQueryData<VersionListData>(listKey, (data) =>
        removeVersionFromList(data, event.versionId)
      )
      queryClient.removeQueries({
        queryKey: versionKeys.body("remote", diagramId, event.versionId),
      })
      // Leaving a preview of the deleted version is the page's job, not the
      // cache's: `?version=` is the source of truth, so clearing the store
      // alone would just be undone by the URL sync.
      return
    }
    case "VERSION_RENAMED":
      queryClient.setQueryData<VersionListData>(listKey, (data) =>
        patchVersionInList(data, event.versionId, {
          name: event.name,
          description: event.description,
        })
      )
      return
    case "VERSION_RESTORED":
      // A restore writes a new pre-restore auto-snapshot row server-side.
      void queryClient.invalidateQueries({ queryKey: listKey })
      return
    case "DIAGRAM_DELETED":
      // Not handled here — no client currently routes on diagram delete;
      // cached entries drop by gcTime once every consumer unmounts.
      return
    default:
      // Unknown event from a newer server during staggered rollout — log and
      // ignore rather than crash older clients.
      log.warn("Unknown control event type", (event as { type: string }).type)
      return
  }
}
