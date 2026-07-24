import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { CapacitorUpdater } from "@capgo/capacitor-updater"
import { log } from "@/logger"

/**
 * Self-hosted, first-party over-the-air web-bundle updates (Capgo, manual mode).
 *
 * Why manual mode: the update bundle is served as a plain static `manifest.json`
 * + signed `.zip` by the webapp's own nginx (same host, same deploy — "deploy ==
 * OTA publish"), so there is no dynamic endpoint to compare versions server-side.
 * This module is that comparison: it fetches the manifest, refuses anything that
 * would land on an incompatible OLDER native shell (`minNativeVersion`), and only
 * downloads a strictly-newer web bundle. The Capgo plugin still enforces the
 * bundle SIGNATURE on download (Encryption V2), so a tampered host cannot ship
 * malicious code, and auto-rolls-back any bundle that never calls
 * `notifyAppReady()`.
 *
 * Everything here is best-effort and fails closed: any network, parse, gating, or
 * download error simply leaves the device on its current, known-good bundle.
 */

const MANIFEST_URL = "https://apollon.aet.cit.tum.de/live-updates/manifest.json"

interface LiveUpdateManifest {
  /** Web bundle version (semver), e.g. "5.2.0". */
  version: string
  /** Absolute HTTPS URL of the signed bundle zip. */
  url: string
  /** SHA-256 of the zip; the plugin verifies it after download. */
  checksum?: string
  /**
   * Minimum native app version (CFBundleShortVersionString) this web bundle is
   * compatible with. A device on an older native shell must NOT apply it —
   * the web build may rely on native/plugin or server-contract changes that
   * only ship with a matching App Store release.
   */
  minNativeVersion?: string
  /**
   * Encryption V2 session key (`ivSessionKey`) for a signed bundle; the plugin
   * uses it, with the app's public key, to decrypt and verify. Present only for
   * encrypted bundles.
   */
  sessionKey?: string
}

/** Numeric semver compare: returns a<0, 0, or >0. Non-numeric parts sort as 0. */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function isLiveUpdateManifest(value: unknown): value is LiveUpdateManifest {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.version === "string" && typeof record.url === "string"
}

/**
 * Confirm the running bundle booted successfully. MUST be called once the app is
 * interactive: if a freshly-applied OTA bundle fails to call this within the
 * plugin's `appReadyTimeout`, the plugin treats it as broken and rolls back to
 * the previous bundle on the next launch. No-op off native.
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
 * Check the first-party manifest and, if a strictly-newer and native-compatible
 * bundle exists, download it and stage it for the NEXT cold start (never a
 * mid-session reload). Best-effort; safe to call unawaited at startup.
 */
export async function checkForLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const [appInfo, current] = await Promise.all([
      App.getInfo(),
      CapacitorUpdater.current(),
    ])

    const response = await fetch(MANIFEST_URL, { cache: "no-store" })
    if (!response.ok) return

    const manifest: unknown = await response.json()
    if (!isLiveUpdateManifest(manifest)) return

    // Gate 1: never apply a bundle newer than this native shell supports.
    if (
      manifest.minNativeVersion &&
      compareSemver(appInfo.version, manifest.minNativeVersion) < 0
    ) {
      return
    }

    // Gate 2: only move forward. `current.bundle.version` is "builtin" for the
    // shipped-in bundle; treat that as "older than any real manifest version".
    const currentVersion = current.bundle.version
    if (
      currentVersion !== "builtin" &&
      compareSemver(manifest.version, currentVersion) <= 0
    ) {
      return
    }

    const bundle = await CapacitorUpdater.download({
      version: manifest.version,
      url: manifest.url,
      ...(manifest.checksum ? { checksum: manifest.checksum } : {}),
      ...(manifest.sessionKey ? { sessionKey: manifest.sessionKey } : {}),
    })

    // Apply on the next cold start, not now — avoids reloading the WebView out
    // from under an active editing session.
    await CapacitorUpdater.next({ id: bundle.id })
    log.debug(`live-update: staged ${manifest.version} for next launch`)
  } catch (error) {
    // Stay on the current bundle on any failure.
    log.warn("live-update: check failed", error)
  }
}
