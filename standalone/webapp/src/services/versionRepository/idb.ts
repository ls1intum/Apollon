import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
} from "idb"
import { toast } from "react-toastify"
import { log } from "@/logger"
import type { VersionKind } from "@/types"

/**
 * Three stores mirror the server's metadata/body split (Redis HASH +
 * gzipped string). Keeping bodies separate lets list queries stream
 * lightweight metadata without dragging ~50 KB of JSON per row across
 * the structured-clone boundary.
 */
export const DB_NAME = "apollon-versions"
export const DB_VERSION = 1

export interface VersionMetaRow {
  id: string
  diagramId: string
  name: string
  description: string
  createdAt: string
  kind: VersionKind
  librarySchemaVersion: string
  seq: number
}

export interface VersionBodyRow {
  diagramId: string
  id: string
  /** JSON-stringified `Diagram`. */
  body: string
}

export interface DiagramMetaRow {
  diagramId: string
  /** Monotonic per-diagram counter — assigned to `seq` at create time. */
  headSeq: number
}

interface ApollonVersionsDB extends DBSchema {
  versions: {
    key: string
    value: VersionMetaRow
    indexes: {
      /** Monotonic per-diagram counter; ASC = oldest first. */
      by_diagram_seq: [string, number]
    }
  }
  versionBodies: {
    key: [string, string]
    value: VersionBodyRow
  }
  diagramMeta: {
    key: string
    value: DiagramMetaRow
  }
}

export type ApollonVersionsDBHandle = IDBPDatabase<ApollonVersionsDB>

/** A read-write transaction spanning all three stores (the version write path). */
export type ApollonVersionsTx = IDBPTransaction<
  ApollonVersionsDB,
  ["versions", "versionBodies", "diagramMeta"],
  "readwrite"
>

/**
 * Lazy + memoised handle to the open DB. Resets the promise on rejection
 * so a transient failure doesn't poison every subsequent caller.
 * `blocked`/`blocking` callbacks ship with v1 to handle the
 * old-tab-open-across-upgrade case when a future `DB_VERSION` bump lands.
 */
let dbPromise: Promise<ApollonVersionsDBHandle> | null = null

export function getDb(): Promise<ApollonVersionsDBHandle> {
  if (!dbPromise) {
    dbPromise = openDB<ApollonVersionsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldV) {
        if (oldV < 1) {
          const v = db.createObjectStore("versions", { keyPath: "id" })
          v.createIndex("by_diagram_seq", ["diagramId", "seq"])
          db.createObjectStore("versionBodies", {
            keyPath: ["diagramId", "id"],
          })
          db.createObjectStore("diagramMeta", { keyPath: "diagramId" })
        }
      },
      blocked() {
        // Another tab holds an older connection that prevents the upgrade.
        // The user must close it for the new tab to finish opening.
        toast.warning(
          "Apollon was updated. Close other Apollon tabs and refresh to continue using version history.",
          { autoClose: false, toastId: "idb-upgrade-blocked" }
        )
      },
      blocking() {
        // This connection is blocking another tab's upgrade. Close ours so
        // the newer tab can take over; the user gets a "please refresh"
        // prompt, after which this tab transparently rebuilds.
        toast.warning(
          "Apollon was updated in another tab. Refresh this tab to continue using version history.",
          { autoClose: false, toastId: "idb-upgrade-blocking" }
        )
      },
    }).catch((err) => {
      // Reset so the next caller gets a fresh attempt instead of a cached
      // rejection. A locked-down browser / file:// origin lands here; the
      // error is rethrown and surfaces as a failed list/create — there is no
      // fallback store.
      dbPromise = null
      log.error("Failed to open apollon-versions IDB", err as Error)
      throw err
    })
  }
  return dbPromise
}

/**
 * Test-only: wipes the cached open promise so each test starts cold.
 * No-op in production code paths.
 */
export function __resetDbForTests(): void {
  dbPromise = null
}
