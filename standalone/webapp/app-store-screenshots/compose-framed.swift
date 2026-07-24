// Composites a Simulator screenshot into an OFFICIAL Apple product bezel with a
// headline + gradient at exact App Store dimensions. Hand-rolled (not fastlane
// `frameit`) deliberately: frameit ships Facebook's frames, not Apple's official
// product bezels, and needs per-device offset files; here the screen aperture is
// found from the bezel's transparent region, so any official bezel drops in.
import CoreGraphics
import CoreText
import Foundation
import ImageIO

guard CommandLine.arguments.count == 6 else {
  fputs(
    """
    Usage: compose-framed.swift <source.png> <output.png> <headline> \
    <font.ttf> <official-apple-bezel.png>\n
    """,
    stderr
  )
  exit(2)
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let headline = CommandLine.arguments[3]
let fontURL = URL(fileURLWithPath: CommandLine.arguments[4])
let frameURL = URL(fileURLWithPath: CommandLine.arguments[5])

guard
  let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
  let screenshot = CGImageSourceCreateImageAtIndex(source, 0, nil),
  let frameSource = CGImageSourceCreateWithURL(frameURL as CFURL, nil),
  let frame = CGImageSourceCreateImageAtIndex(frameSource, 0, nil),
  let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
  let context = CGContext(
    data: nil,
    width: screenshot.width,
    height: screenshot.height,
    bitsPerComponent: 8,
    bytesPerRow: screenshot.width * 4,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
  ),
  let fontProvider = CGDataProvider(url: fontURL as CFURL),
  let graphicsFont = CGFont(fontProvider)
else {
  fputs("Could not initialize framed screenshot composition\n", stderr)
  exit(1)
}

let canvasWidth = CGFloat(screenshot.width)
let canvasHeight = CGFloat(screenshot.height)
let portrait = canvasHeight > canvasWidth
let framePortrait = frame.height > frame.width

guard portrait == framePortrait else {
  fputs(
    "The Apple product bezel must have the same orientation as the screenshot\n",
    stderr
  )
  exit(1)
}

let dark =
  sourceURL.lastPathComponent.contains("04-")
  || sourceURL.lastPathComponent.contains("05-")

func color(_ hex: UInt32) -> CGColor {
  CGColor(
    colorSpace: colorSpace,
    components: [
      CGFloat((hex >> 16) & 0xff) / 255,
      CGFloat((hex >> 8) & 0xff) / 255,
      CGFloat(hex & 0xff) / 255,
      1
    ]
  )!
}

// Apple product-bezel PNGs expose the device screen as a transparent region.
// Find the connected transparent component around the center so this remains
// independent of a particular bezel's pixel dimensions.
struct ScreenAperture {
  let bounds: CGRect
  let mask: CGImage
}

func grayscaleMask(from visited: [UInt8], width: Int, height: Int) -> CGImage? {
  let maskData = Data(visited.map { $0 == 1 ? 255 : 0 })
  guard let maskProvider = CGDataProvider(data: maskData as CFData) else {
    return nil
  }
  return CGImage(
    width: width,
    height: height,
    bitsPerComponent: 8,
    bitsPerPixel: 8,
    bytesPerRow: width,
    space: CGColorSpaceCreateDeviceGray(),
    bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue),
    provider: maskProvider,
    decode: nil,
    shouldInterpolate: false,
    intent: .defaultIntent
  )
}

// Flood-fill the connected transparent region from the image center; returns the
// visited mask + its bounding box, or nil if the center isn't transparent or the
// region is too small to be a screen. `pixels` is RGBA and outlives this call.
func floodFillTransparentRegion(
  pixels: UnsafePointer<UInt8>, width: Int, height: Int
) -> (visited: [UInt8], bounds: CGRect)? {
  let center = (height / 2) * width + width / 2
  guard pixels[center * 4 + 3] < 16 else { return nil }

  let pixelCount = width * height
  var visited = [UInt8](repeating: 0, count: pixelCount)
  var queue = [Int](repeating: 0, count: pixelCount)
  var head = 0
  var tail = 1
  queue[0] = center
  visited[center] = 1
  var minX = width, minY = height, maxX = 0, maxY = 0

  while head < tail {
    let index = queue[head]
    head += 1
    let column = index % width, row = index / width
    minX = min(minX, column)
    minY = min(minY, row)
    maxX = max(maxX, column)
    maxY = max(maxY, row)
    let neighbors = [
      column > 0 ? index - 1 : -1,
      column + 1 < width ? index + 1 : -1,
      row > 0 ? index - width : -1,
      row + 1 < height ? index + width : -1,
    ]
    for neighbor in neighbors where neighbor >= 0 {
      guard visited[neighbor] == 0, pixels[neighbor * 4 + 3] < 16 else { continue }
      visited[neighbor] = 1
      queue[tail] = neighbor
      tail += 1
    }
  }

  guard maxX - minX > width / 2, maxY - minY > height / 2 else { return nil }
  let bounds = CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
  return (visited, bounds)
}

func transparentScreenAperture(in image: CGImage) -> ScreenAperture? {
  let width = image.width
  let height = image.height
  guard
    let alphaContext = CGContext(
      data: nil,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: width * 4,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )
  else {
    return nil
  }
  alphaContext.clear(CGRect(x: 0, y: 0, width: width, height: height))
  alphaContext.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

  guard let rawData = alphaContext.data else { return nil }
  let pixels = rawData.assumingMemoryBound(to: UInt8.self)

  guard
    let region = floodFillTransparentRegion(
      pixels: pixels, width: width, height: height),
    let mask = grayscaleMask(from: region.visited, width: width, height: height)
  else {
    return nil
  }
  return ScreenAperture(bounds: region.bounds, mask: mask)
}

guard let frameScreenAperture = transparentScreenAperture(in: frame) else {
  fputs(
    "Could not locate the transparent screen in the Apple product bezel\n",
    stderr
  )
  exit(1)
}

let gradientColors =
  dark
  ? [color(0x06192c), color(0x123f6d)]
  : [color(0xf8fbff), color(0xdceafa)]
let gradient = CGGradient(
  colorsSpace: colorSpace,
  colors: gradientColors as CFArray,
  locations: [0, 1]
)!
context.drawLinearGradient(
  gradient,
  start: CGPoint(x: 0, y: canvasHeight),
  end: CGPoint(x: canvasWidth, y: 0),
  options: []
)

let headlineFont = CTFontCreateWithGraphicsFont(
  graphicsFont,
  portrait ? 86 : 78,
  nil,
  nil
)
let headlineColor = dark ? color(0xffffff) : color(0x102a43)
let attributedHeadline = NSAttributedString(
  string: headline,
  attributes: [
    NSAttributedString.Key(kCTFontAttributeName as String): headlineFont,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String):
      headlineColor
  ]
)
let headlineLine = CTLineCreateWithAttributedString(attributedHeadline)
let headlineBounds = CTLineGetBoundsWithOptions(
  headlineLine,
  [.useGlyphPathBounds]
)
context.textPosition = CGPoint(
  x: (canvasWidth - headlineBounds.width) / 2,
  y: canvasHeight - (portrait ? 210 : 125)
)
CTLineDraw(headlineLine, context)

let deviceWidth = canvasWidth * (portrait ? 0.80 : 0.84)
let scale = deviceWidth / CGFloat(frame.width)
let deviceHeight = CGFloat(frame.height) * scale
let deviceX = (canvasWidth - deviceWidth) / 2
let deviceTop = portrait ? 380.0 : 225.0
let deviceY = canvasHeight - deviceTop - deviceHeight
let deviceRect = CGRect(
  x: deviceX,
  y: deviceY,
  width: deviceWidth,
  height: deviceHeight
)
let screenRect = CGRect(
  x: deviceX + frameScreenAperture.bounds.minX * scale,
  y: deviceY + frameScreenAperture.bounds.minY * scale,
  width: frameScreenAperture.bounds.width * scale,
  height: frameScreenAperture.bounds.height * scale
)

guard deviceY >= 0 else {
  fputs("The Apple product bezel does not fit the App Store canvas\n", stderr)
  exit(1)
}

context.saveGState()
context.clip(to: deviceRect, mask: frameScreenAperture.mask)
context.draw(screenshot, in: screenRect)
context.restoreGState()
context.draw(frame, in: deviceRect)

guard
  let framedImage = context.makeImage(),
  let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    "public.png" as CFString,
    1,
    nil
  )
else {
  fputs("Could not create \(outputURL.path)\n", stderr)
  exit(1)
}

CGImageDestinationAddImage(
  destination,
  framedImage,
  [kCGImagePropertyHasAlpha: false] as CFDictionary
)

guard CGImageDestinationFinalize(destination) else {
  fputs("Could not write \(outputURL.path)\n", stderr)
  exit(1)
}
