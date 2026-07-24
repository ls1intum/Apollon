// Produce the over-the-air live-update artifacts from an already-built `dist/`:
//   dist/live-updates/apollon-<version>.zip   — the web bundle, signed in prod
//   dist/live-updates/manifest.json           — the first-party update pointer
//
// This runs as part of the webapp image build, so the image the normal deploy
// ships already contains the current bundle ("deploy == OTA publish"). nginx
// serves dist/live-updates/ (see nginx.conf); the app checks the manifest (see
// src/services/liveUpdate.ts).
//
// Signing (Capgo Encryption V2) is the security boundary — with it, the host
// need not be trusted. When CAPGO_PRIVATE_KEY is set the bundle is signed with
// @capgo/cli; without it (local/PR builds) an UNSIGNED bundle is emitted and a
// warning is logged. Never ship a build with CAPGO_PUBLIC_KEY set in the app but
// no signing here — the plugin would reject every update.
//
// Env:
//   CAPGO_PRIVATE_KEY         PEM of the RSA private key (CI secret). Enables signing.
//   CAPGO_MIN_NATIVE_VERSION  Minimum native app version this web bundle supports.
//                             Bump ONLY when a matching App Store build ships.
//                             Defaults to the web version's major.0.0.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const webappDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const distDir = path.join(webappDir, "dist")
const outDir = path.join(distDir, "live-updates")

const version = JSON.parse(
  fs.readFileSync(path.join(webappDir, "package.json"), "utf8")
).version

const minNativeVersion =
  process.env.CAPGO_MIN_NATIVE_VERSION || `${version.split(".")[0]}.0.0`

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(
    "build-live-update: dist/ is not built; run the webapp build first."
  )
  process.exit(1)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const zipName = `apollon-${version}.zip`
const zipPath = path.join(outDir, zipName)

// Zip the built web assets at the archive root (Capgo unpacks them as the new
// web bundle). Exclude the live-updates dir itself so the bundle never nests a
// copy of prior bundles.
execFileSync("zip", ["-r", "-q", "-X", zipPath, ".", "-x", "live-updates/*"], {
  cwd: distDir,
  stdio: "inherit",
})

let checksum = createHash("sha256")
  .update(fs.readFileSync(zipPath))
  .digest("hex")

const privateKey = process.env.CAPGO_PRIVATE_KEY
if (privateKey) {
  // Encryption V2: @capgo/cli encrypts the zip in place and prints the checksum
  // of the encrypted artifact, which is what the plugin verifies against the
  // public key baked into the app. Keep the CLI invocation pinned to the
  // installed @capgo/cli; verify the flags once when generating the keypair.
  const keyFile = path.join(outDir, ".signing-key.pem")
  fs.writeFileSync(keyFile, privateKey, { mode: 0o600 })
  try {
    const output = execFileSync(
      "npx",
      [
        "--no-install",
        "@capgo/cli",
        "bundle",
        "encrypt",
        zipPath,
        checksum,
        "--key",
        keyFile,
      ],
      { cwd: webappDir, encoding: "utf8" }
    )
    const match = output.match(/checksum[^\w]*([a-f0-9]{16,})/i)
    if (match) checksum = match[1]
  } finally {
    fs.rmSync(keyFile, { force: true })
  }
} else {
  console.warn(
    "build-live-update: CAPGO_PRIVATE_KEY unset — emitting an UNSIGNED bundle. " +
      "Do NOT deploy this to production with CAPGO_PUBLIC_KEY set in the app."
  )
}

const manifest = {
  version,
  url: `https://apollon.aet.cit.tum.de/live-updates/${zipName}`,
  checksum,
  minNativeVersion,
}
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
)

console.log(
  `build-live-update: ${zipName} (${privateKey ? "signed" : "UNSIGNED"}), ` +
    `minNativeVersion ${minNativeVersion}`
)
