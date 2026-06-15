# Legacy iOS → Capacitor data migration

One-time, automatic migration of diagrams from the **legacy native Apollon iOS
app** (`ls1intum/apollon-ios`, App Store id `6474762031`) into this Capacitor
app, so no user loses locally-saved work on upgrade.

It works **only because both apps ship under the same bundle id**
`de.tum.cit.ase.apollon` (same listing, same Apple team `T7PP2KY2B6`): an
in-place update inherits the legacy sandbox, so the plugin reads its SwiftData
store directly. The store is opened **read-only** (`allowsSave: false`) and
never modified, so it stays a permanent fallback (manual JSON import keeps
working) even after this code is removed.

## How it works

```
in-place upgrade (same bundle id)
  └─ webapp boots, waits for the zustand persist store to finish hydrating
     └─ runLegacyMigrationIfNeeded()        [src/services/legacyMigration.ts]
        └─ isMigrationDone()        → skip if already done
        └─ getLegacyDiagrams()      → [v3 JSON strings]
           ├─ no store on disk   → mark done (fresh install)
           ├─ store unreadable   → reject → flag stays unset → retry next launch
           └─ per diagram: importDiagram (v3→v4, isolated) → store.importModels()
        └─ setMigrationDone()       (durable UserDefaults flag)
```

| Piece | File |
| --- | --- |
| Native plugin (reads SwiftData → v3 JSON) | `LegacyMigrationPlugin.swift` |
| Plugin registration (app-embedded plugins aren't auto-registered) | `MainViewController.swift` |
| Frozen copy of the legacy data models | `ApollonLegacyModels.swift` |
| JS runner + boot wiring | `src/services/legacyMigration.ts`, `src/index.tsx` |
| Bulk idempotent store insert | `usePersistenceModelStore.importModels` |
| v3→v4 conversion (shared with web) | `@tumaet/apollon` `importDiagram` |

## Verified without a device

`library/tests/unit/legacyIosMigration.test.ts` (per-type v3→v4 fidelity +
handle/ordering) and `src/services/legacyMigration.test.ts` (gate, isolation,
flag semantics) pass; the Swift type-checks at iOS 15 and 17. The store
schema-match and container read can only be proven on a real upgrade — do the
test below before release.

## Authentic upgrade test (required before release)

Run on a simulator/device with iOS 17+.

1. **Seed the legacy app.** Open `.context/apollon-ios` in Xcode; set its app
   target's bundle id to the shipped `de.tum.cit.ase.apollon` (that repo commits
   `de.tum.cit.apollon` but fastlane renames it on release). Run, create a rich
   set of diagrams (one per type; attributes/methods; several relationship kinds
   and corner-direction handles).
2. **(sanity)** `xcrun simctl get_app_container booted de.tum.cit.ase.apollon
   data` → confirm `Library/Application Support/default.store` exists; if the
   filename differs, update `LegacyStoreReader.storeURL()`.
3. **Install the new app over it** without deleting the legacy app (same bundle
   id ⇒ same container): from `standalone/webapp`, `pnpm build && pnpm exec cap
   sync ios`, then run the **App** scheme on the **same** simulator.
4. **Verify:** every diagram appears, renders, keeps its title; relaunch → no
   duplicates (flag set). Then erase + fresh install → starts empty, no errors.

## Removal (planned sunset, after the installed base has upgraded)

Self-contained by design:

1. Delete this `Migration/` folder and its entries in
   `App.xcodeproj/project.pbxproj` (the `Migration` group + the `AB10…`-tagged
   file refs / build files / sources entries), and revert the `Main.storyboard`
   view-controller `customClass` to `CAPBridgeViewController`.
2. Delete `src/services/legacyMigration.ts` (+ test) and the
   `startLegacyMigration()` call in `src/index.tsx`.
3. Optionally drop `usePersistenceModelStore.importModels` if unused.

The legacy store is never deleted, so a late upgrader can still import manually.
