import Capacitor

/// Registers the app-embedded LegacyMigration plugin. Capacitor only
/// auto-registers plugins from installed packages (via capacitor.config.json's
/// packageClassList); plugins defined inside the app target must be registered
/// explicitly here, or their JS calls reject with UNIMPLEMENTED.
/// https://capacitorjs.com/docs/ios/custom-code
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LegacyMigrationPlugin())
    }
}
