// Capacitor bridge that reads the legacy native-iOS SwiftData store and returns
// each diagram as Apollon v3 JSON. See Migration/README.md for the design.

import Foundation
import Capacitor

@objc(LegacyMigrationPlugin)
public class LegacyMigrationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LegacyMigrationPlugin"
    public let jsName = "LegacyMigration"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getLegacyDiagrams", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isMigrationDone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMigrationDone", returnType: CAPPluginReturnPromise),
    ]

    private let migrationDoneKey = "apollonLegacyMigrationDone"

    @objc func isMigrationDone(_ call: CAPPluginCall) {
        call.resolve(["done": UserDefaults.standard.bool(forKey: migrationDoneKey)])
    }

    @objc func setMigrationDone(_ call: CAPPluginCall) {
        UserDefaults.standard.set(true, forKey: migrationDoneKey)
        call.resolve()
    }

    @objc func getLegacyDiagrams(_ call: CAPPluginCall) {
        // The legacy app required iOS 17 (SwiftData), so on older systems there
        // can be no legacy store. Report "no data" rather than failing.
        guard #available(iOS 17, *) else {
            call.resolve(["diagrams": []])
            return
        }

        do {
            let diagrams = try LegacyStoreReader.readAllAsV3JSON()
            call.resolve(["diagrams": diagrams])
        } catch LegacyStoreReader.MigrationError.noStore {
            // Genuine fresh install: no legacy store on disk. Safe to complete
            // migration (JS marks it done so we never look again).
            call.resolve(["diagrams": []])
        } catch {
            // The store exists but could not be read. Reject so the JS side
            // leaves the migration flag unset and retries on the next launch,
            // rather than silently treating a readable user as having no data.
            CAPLog.print("LegacyMigration: failed to read legacy store: \(error)")
            call.reject("Failed to read legacy diagrams", nil, error)
        }
    }
}

@available(iOS 17, *)
enum LegacyStoreReader {
    enum MigrationError: Error {
        case noStore
    }

    /// Default on-disk location of the legacy SwiftData store. The legacy app
    /// used `ModelContainer(for: ApollonDiagram.self)` with no custom
    /// configuration, so SwiftData persisted to Application Support/default.store.
    private static func storeURL() throws -> URL {
        let appSupport = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: false
        )
        return appSupport.appendingPathComponent("default.store")
    }

    /// Opens the legacy store read-only (we never save) and returns every
    /// diagram re-encoded as Apollon v3 JSON.
    static func readAllAsV3JSON() throws -> [String] {
        let url = try storeURL()

        guard FileManager.default.fileExists(atPath: url.path) else {
            throw MigrationError.noStore
        }

        // allowsSave: false guarantees we never mutate the legacy store, even
        // if a future edit accidentally calls save().
        let configuration = ModelConfiguration(url: url, allowsSave: false)
        let container = try ModelContainer(
            for: ApollonDiagram.self,
            configurations: configuration
        )
        let context = ModelContext(container)
        let diagrams = try context.fetch(FetchDescriptor<ApollonDiagram>())

        let encoder = JSONEncoder()
        var result: [String] = []
        result.reserveCapacity(diagrams.count)

        for diagram in diagrams {
            // Isolate per-diagram so one corrupt row can't sink the whole batch;
            // the JS side also re-validates each via importDiagram().
            do {
                let dto = Diagram(
                    id: diagram.id,
                    title: diagram.title,
                    lastUpdate: diagram.lastUpdate,
                    diagramType: diagram.diagramType,
                    model: diagram.model
                )
                let data = try encoder.encode(dto)
                if let json = String(data: data, encoding: .utf8) {
                    result.append(json)
                }
            } catch {
                CAPLog.print("LegacyMigration: skipping one diagram: \(error)")
            }
        }

        return result
    }
}
