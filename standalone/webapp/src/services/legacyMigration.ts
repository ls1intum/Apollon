import { registerPlugin, Capacitor } from "@capacitor/core"
import { importDiagram, type UMLModel } from "@tumaet/apollon"
import { toast } from "react-toastify"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { log } from "@/logger"

// One-time migration of diagrams from the legacy native iOS app into the local
// persistence store. Design and removal steps: ios/App/App/Migration/README.md.

interface LegacyMigrationPlugin {
  /** Returns the legacy diagrams as an array of v3 JSON strings. Empty on a
   * fresh install or any non-iOS platform. */
  getLegacyDiagrams(): Promise<{ diagrams: string[] }>
  /** Whether migration has already completed (durable UserDefaults flag). */
  isMigrationDone(): Promise<{ done: boolean }>
  /** Marks migration complete so it never runs again. */
  setMigrationDone(): Promise<void>
}

const LegacyMigration = registerPlugin<LegacyMigrationPlugin>("LegacyMigration")

export interface LegacyMigrationResult {
  migrated: number
  failed: number
}

/**
 * Run the legacy migration if it hasn't run yet. Safe to call on every launch
 * and on every platform: it no-ops off iOS and after completion. MUST be called
 * only after the persistence store has finished hydrating from localStorage so
 * hydration cannot clobber the imported models (see boot wiring in index.tsx).
 */
export async function runLegacyMigrationIfNeeded(): Promise<LegacyMigrationResult | void> {
  // The legacy app only ever existed on iOS; the plugin is absent elsewhere.
  if (Capacitor.getPlatform() !== "ios") return

  try {
    const { done } = await LegacyMigration.isMigrationDone()
    if (done) return

    const { diagrams } = await LegacyMigration.getLegacyDiagrams()

    if (!diagrams || diagrams.length === 0) {
      // Fresh install (or no legacy data): nothing to do, never check again.
      await LegacyMigration.setMigrationDone()
      return { migrated: 0, failed: 0 }
    }

    const imported: { model: UMLModel; lastModifiedAt?: string }[] = []
    const failedTitles: string[] = []

    // Per-diagram isolation: one unconvertible diagram must not abort the rest.
    for (const raw of diagrams) {
      let parsed: { lastUpdate?: string; title?: string } | undefined
      try {
        parsed = JSON.parse(raw)
        const model = importDiagram(parsed)
        imported.push({ model, lastModifiedAt: parsed?.lastUpdate })
      } catch (error) {
        failedTitles.push(parsed?.title ?? "Untitled diagram")
        log.error("Failed to migrate a legacy diagram:", error)
      }
    }

    if (imported.length > 0) {
      usePersistenceModelStore.getState().importModels(imported)
    }

    // Mark done even on partial failure: the native SwiftData store is left
    // intact as a permanent fallback (manual JSON import still works), and the
    // converter is hardened+tested for every diagram type the legacy app could
    // produce — so we avoid nagging the user on every launch. Only a hard error
    // from the plugin itself (caught below) leaves the flag unset for a retry.
    await LegacyMigration.setMigrationDone()

    if (failedTitles.length > 0) {
      toast.warning(
        `Imported ${imported.length} diagram(s) from the previous app. ` +
          `${failedTitles.length} could not be converted: ${failedTitles.join(", ")}.`
      )
    } else if (imported.length > 0) {
      toast.success(
        `Imported ${imported.length} diagram(s) from the previous Apollon app.`
      )
    }

    return { migrated: imported.length, failed: failedTitles.length }
  } catch (error) {
    // Transient/unexpected failure (e.g. plugin call rejected). Leave the flag
    // unset so the migration is retried on the next launch.
    log.error("Legacy iOS migration failed; will retry next launch:", error)
  }
}
