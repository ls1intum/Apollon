import XCTest

final class AppStoreScreenshots: XCTestCase {
  private var app: XCUIApplication!

  @MainActor
  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    setupSnapshot(app)

    if UIDevice.current.userInterfaceIdiom == .pad {
      XCUIDevice.shared.orientation = .landscapeRight
    } else {
      XCUIDevice.shared.orientation = .portrait
    }

    app.launch()
    waitFor("Your diagrams", timeout: 30)
  }

  @MainActor
  func testCaptureAppStoreScreenshots() throws {
    sleep(3)
    snapshot("02-Your-Diagrams")

    tap("Open Apollon")
    waitFor("File")
    tapFitViewControl()
    sleep(2)
    snapshot("01-Class-Diagram")

    tap("File")
    tap("New Diagram")
    waitFor("New Diagram")
    sleep(1)
    snapshot("03-Diagram-Types")

    tap("Cancel")
    tap("Switch to dark mode")
    waitFor("Switch to light mode")
    sleep(2)
    snapshot("04-Dark-Appearance")

    tap("File")
    waitFor("As PPTX (Presentation)")
    sleep(1)
    snapshot("05-Export-Formats")
  }

  @MainActor
  private func waitFor(
    _ label: String,
    timeout: TimeInterval = 20
  ) {
    let element = firstElement(label)
    XCTAssertTrue(
      element.waitForExistence(timeout: timeout),
      "Expected an accessible element labelled '\(label)'"
    )
  }

  @MainActor
  private func tap(_ label: String) {
    let element = firstElement(label)
    XCTAssertTrue(
      element.waitForExistence(timeout: 20),
      "Expected an accessible element labelled '\(label)'"
    )

    if element.isHittable {
      element.tap()
    } else {
      element.coordinate(
        withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)
      ).tap()
    }
  }

  @MainActor
  private func tapFitViewControl() {
    // React Flow's fit-view button is the third control in the bottom-left
    // group. WKWebView does not expose that canvas control to XCTest's
    // accessibility tree, so the screenshot harness taps its stable visual
    // position in points. This affects only the UI-test target.
    let offset: CGVector
    if UIDevice.current.userInterfaceIdiom == .pad {
      offset = CGVector(dx: 132, dy: app.frame.height - 41)
    } else {
      offset = CGVector(dx: 100, dy: app.frame.height - 64)
    }
    app.coordinate(
      withNormalizedOffset: CGVector(dx: 0, dy: 0)
    ).withOffset(offset).tap()
  }

  @MainActor
  private func firstElement(_ label: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label == %@", label))
      .firstMatch
  }
}
