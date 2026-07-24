import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { CapacitorUpdater } from "@capgo/capacitor-updater"
import semver from "semver"
import { log } from "@/logger"

/**
 * Self-hosted, first-party over-the-air web-bundle updates (Capgo, manual mode).
 *
 * The bundle is served as a static `manifest.json` + signed `.zip` by the
 * webapp's own nginx (same host, same deploy), so there is no dynamic endpoint
 * to compare versions server-side — this module is that comparison. The Capgo
 * plugin still enforces the bundle SIGNATURE on download (Encryption V2) and
 * auto-rolls-back any bundle that never calls `notifyAppReady()`, so every
 * failure here fails closed: the device stays on its current, known-good bundle.
 */

const MANIFEST_URL = "https://apollon.aet.cit.tum.de/live-updates/manifest.json"
const MANIFEST_TIMEOUT_MS = 10_000

export interface LiveUpdateManifest {
  /** Web bundle version (semver), e.g. "5.2.0". */
  version: string
  /** Absolute HTTPS URL of the signed bundle zip. */
  url: string
  /** SHA-256 the plugin verifies after download. */
  checksum?: string
  /**
   * Minimum native app version (CFBundleShortVersionString) this bundle needs.
   * A device on an older native shell must not apply it — the web build may rely
   * on native/plugin or server-contract changes that ship only with a matching
   * App Store release.
   */
  minNativeVersion?: string
  /** Encryption V2 session key (`ivSessionKey`); present only for signed bundles. */
  sessionKey?: string
}

export function isLiveUpdateManifest(
  value: unknown
): value is LiveUpdateManifest {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.version === "string" && typeof record.url === "string"
}

/**
 * Pure gate: whether `manifest` should be applied to a device on native version
 * `nativeVersion` currently running bundle `currentVersion` ("builtin" for the
 * shipped-in bundle). Only moves forward and never past the native shell.
 */
export function shouldApplyUpdate(
  manifest: LiveUpdateManifest,
  nativeVersion: string,
  currentVersion: string
): boolean {
  if (
    manifest.minNativeVersion &&
    semver.lt(nativeVersion, manifest.minNativeVersion)
  ) {
    return false
  }
  return (
    currentVersion === "builtin" || semver.gt(manifest.version, currentVersion)
  )
}

/**
 * Confirm the running bundle booted. MUST be called once the app is interactive:
 * a freshly-applied OTA bundle that fails to call this within the plugin's
 * `appReadyTimeout` is treated as broken and rolled back on the next launch.
 */
export async function notifyLiveUpdateReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await CapacitorUpdater.notifyAppReady()
  } catch (error) {
    log.warn("live-update: notifyAppReady failed", error)
  }
}

/**
 * Check the manifest and stage a newer, native-compatible bundle for the NEXT
 * cold start (never a mid-session reload). Best-effort; safe to call unawaited.
 */
export async function checkForLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const [appInfo, current] = await Promise.all([
      App.getInfo(),
      CapacitorUpdater.current(),
    ])

    const response = await fetch(MANIFEST_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    })
    if (!response.ok) return

    const manifest: unknown = await response.json()
    if (
      !isLiveUpdateManifest(manifest) ||
      !shouldApplyUpdate(manifest, appInfo.version, current.bundle.version)
    ) {
      return
    }

    const bundle = await CapacitorUpdater.download({
      version: manifest.version,
      url: manifest.url,
      ...(manifest.checksum ? { checksum: manifest.checksum } : {}),
      ...(manifest.sessionKey ? { sessionKey: manifest.sessionKey } : {}),
    })
    await CapacitorUpdater.next({ id: bundle.id })
    log.debug(`live-update: staged ${manifest.version} for next launch`)
  } catch (error) {
    log.warn("live-update: check failed", error)
  }
}
