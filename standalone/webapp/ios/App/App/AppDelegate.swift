import UIKit
import Capacitor

// swiftlint:disable line_length
// Capacitor scaffold. UIApplicationDelegate signatures exceed the line-length
// limit but are fixed by Apple's API. Empty no-op lifecycle stubs from the
// template were removed; the URL / Universal Link forwarders are kept because
// the Capacitor App API relies on them.

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
// swiftlint:enable line_length
