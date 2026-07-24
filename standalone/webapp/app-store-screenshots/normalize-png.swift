import CoreGraphics
import Foundation
import ImageIO

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: normalize-png.swift <source.png> <output.png>\n", stderr)
  exit(2)
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard
  let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
  let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
  let context = CGContext(
    data: nil,
    width: image.width,
    height: image.height,
    bitsPerComponent: 8,
    bytesPerRow: image.width * 4,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
  )
else {
  fputs("Could not decode \(sourceURL.path) as an RGB image\n", stderr)
  exit(1)
}

context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))

guard
  let normalizedImage = context.makeImage(),
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
  normalizedImage,
  [kCGImagePropertyHasAlpha: false] as CFDictionary
)

guard CGImageDestinationFinalize(destination) else {
  fputs("Could not write \(outputURL.path)\n", stderr)
  exit(1)
}
