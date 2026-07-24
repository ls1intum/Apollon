import CoreGraphics
import Foundation
import ImageIO

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: validate-screenshot-set.swift <screenshots-directory>\n", stderr)
  exit(2)
}

let directory = URL(fileURLWithPath: CommandLine.arguments[1])
let fileManager = FileManager.default

guard
  let enumerator = fileManager.enumerator(
    at: directory,
    includingPropertiesForKeys: [.isRegularFileKey],
    options: [.skipsHiddenFiles]
  )
else {
  fputs("Could not read \(directory.path)\n", stderr)
  exit(1)
}

let screenshots =
  enumerator
  .compactMap { $0 as? URL }
  .filter { $0.pathExtension.lowercased() == "png" }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

let expectedFeatures = [
  "01-Class-Diagram",
  "02-Your-Diagrams",
  "03-Diagram-Types",
  "04-Dark-Appearance",
  "05-Export-Formats"
]
struct ExpectedDevice {
  let prefix: String
  let width: Int
  let height: Int
}
let expectedDevices = [
  ExpectedDevice(prefix: "iPhone 17 Pro Max", width: 1320, height: 2868),
  ExpectedDevice(prefix: "iPad Pro 13-inch (M4)", width: 2752, height: 2064)
]

guard screenshots.count == expectedFeatures.count * expectedDevices.count else {
  fputs(
    "Expected 10 screenshots in \(directory.path), found \(screenshots.count)\n",
    stderr
  )
  exit(1)
}

var failed = false

for device in expectedDevices {
  for feature in expectedFeatures {
    let matching = screenshots.filter {
      $0.lastPathComponent.hasPrefix(device.prefix)
        && $0.lastPathComponent.contains(feature)
    }

    guard matching.count == 1, let url = matching.first else {
      fputs("Missing or duplicate \(device.prefix) \(feature)\n", stderr)
      failed = true
      continue
    }

    guard
      let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(
        source,
        0,
        nil
      ) as? [CFString: Any],
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
      fputs("Could not decode \(url.path)\n", stderr)
      failed = true
      continue
    }

    if image.width != device.width || image.height != device.height {
      fputs(
        """
        Invalid size for \(url.lastPathComponent): \
        \(image.width)x\(image.height), expected \
        \(device.width)x\(device.height)\n
        """,
        stderr
      )
      failed = true
    }

    if properties[kCGImagePropertyHasAlpha] as? Bool == true {
      fputs("Alpha channel found in \(url.lastPathComponent)\n", stderr)
      failed = true
    }

    if image.colorSpace?.name != CGColorSpace.sRGB {
      fputs("Non-sRGB color space in \(url.lastPathComponent)\n", stderr)
      failed = true
    }
  }
}

guard !failed else {
  exit(1)
}

print(
  "Validated \(screenshots.count) opaque sRGB App Store screenshots in "
    + directory.path
)
