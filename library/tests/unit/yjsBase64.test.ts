import { describe, it, expect } from "vitest"
import { YjsSync } from "@/sync/yjsSync"

// The >64KiB fill spans every byte value (0..255) via (i*31+7)%256, so a single
// large round-trip both proves byte-exactness and stresses the codec at a size
// that overflows a `String.fromCharCode(...spread)` call stack.
const makeLargeBuffer = () => {
  const size = 64 * 1024 + 7
  const input = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    input[i] = (i * 31 + 7) % 256
  }
  return input
}

describe("YjsSync base64 codec", () => {
  const hasNativeCodec =
    typeof (Uint8Array.prototype as { toBase64?: () => string }).toBase64 ===
    "function"

  // Skips below the pinned Node (24, which ships `Uint8Array.toBase64`) so this
  // never silently degrades into a duplicate of the fallback test below.
  it.skipIf(!hasNativeCodec)(
    "round-trips a large (>64KiB) byte array via the native path",
    () => {
      const input = makeLargeBuffer()
      const decoded = YjsSync.base64ToUint8(YjsSync.uint8ToBase64(input))
      expect(decoded).toEqual(input)
    }
  )

  it("round-trips a large (>64KiB) byte array via the loop fallback", () => {
    // Node ships `Uint8Array.prototype.toBase64`, so the native branch is what
    // the suite normally exercises. Force the char-by-char fallback to guard a
    // `String.fromCharCode(...spread)` reintroduction, which would overflow the
    // call stack on a buffer this size.
    const proto = Uint8Array.prototype as { toBase64?: () => string }
    const native = proto.toBase64
    delete proto.toBase64
    try {
      const input = makeLargeBuffer()
      const decoded = YjsSync.base64ToUint8(YjsSync.uint8ToBase64(input))
      expect(decoded).toEqual(input)
    } finally {
      if (native) proto.toBase64 = native
    }
  })

  it("round-trips an empty array", () => {
    const decoded = YjsSync.base64ToUint8(
      YjsSync.uint8ToBase64(new Uint8Array(0))
    )
    expect(decoded).toEqual(new Uint8Array(0))
  })
})
