/**
 * Minimal platform detection, vendored from Ionic's platform utilities.
 * `isIOS`/`isAndroid` reproduce `@ionic/core`'s `isPlatform("ios"|"android")`
 * byte-for-byte (user-agent based — true in mobile browsers too, matching the
 * prior behavior). `isNativePlatform` is Capacitor's own API, which is exactly
 * what Ionic's `isPlatform("capacitor")` resolves to.
 *
 * Copyright (c) Ionic (ionic-team/ionic-framework, MIT —
 * https://github.com/ionic-team/ionic-framework/blob/main/LICENSE)
 */
import { Capacitor } from "@capacitor/core"

const test = (expr: RegExp): boolean =>
  typeof navigator !== "undefined" && expr.test(navigator.userAgent)

// iPadOS 13+ presents a desktop "Macintosh" user agent; a coarse pointer
// disambiguates a real iPad from a Mac. Mirrors @ionic/core's isIpad().
const isIpad = (): boolean =>
  test(/iPad/i) ||
  (test(/Macintosh/i) &&
    typeof matchMedia !== "undefined" &&
    matchMedia("(any-pointer:coarse)").matches)

export const isIOS = (): boolean => test(/iPhone|iPod/i) || isIpad()

export const isAndroid = (): boolean => test(/android|sink/i)

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform()

// --- Apollon's own, not vendored from Ionic ---

/**
 * Whether to render shortcuts with macOS key symbols. Display-only — no handler
 * branches on it (they take Ctrl or Cmd either way), so a wrong guess costs a
 * glyph, not a shortcut. iPadOS 13+ reports a desktop `Macintosh` UA, which is
 * what we want here: an iPad with a keyboard has a ⌘ key.
 */
export const isMacLike = (): boolean => test(/mac|iphone|ipod/i)
