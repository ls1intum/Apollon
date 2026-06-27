/**
 * Minimal platform detection, vendored from Ionic's platform utilities
 * (`@ionic/core`, MIT — ionic-team/ionic-framework). The webapp only ever
 * called `isPlatform("ios" | "android" | "capacitor")`, so pulling the entire
 * `@ionic/react` barrel (which boots the `@ionic/core` Stencil runtime and its
 * `p-*` component chunks into the initial bundle) was pure dead weight.
 *
 * `isIOS`/`isAndroid` reproduce `@ionic/core`'s `isPlatform("ios"|"android")`
 * byte-for-byte (user-agent based — true in mobile browsers too, matching the
 * prior behavior). `isNativePlatform` is Capacitor's own API, which is exactly
 * what Ionic's `isPlatform("capacitor")` resolves to.
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

/** Equivalent to `@ionic/core` `isPlatform("ios")`. */
export const isIOS = (): boolean => test(/iPhone|iPod/i) || isIpad()

/** Equivalent to `@ionic/core` `isPlatform("android")`. */
export const isAndroid = (): boolean => test(/android|sink/i)

/**
 * Equivalent to `@ionic/core` `isPlatform("capacitor")` — running inside a
 * Capacitor native shell (the iOS/Android app), not a browser.
 */
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform()
