// Package an already-built `dist/` into the over-the-air live-update artifacts
// (`live-updates-dist/apollon-<version>.zip` + `manifest.json`) for the
// ios-live-update workflow to publish.
//
// Signing (Capgo Encryption V2) is the security boundary: with it the host need
// not be trusted. When CAPGO_PRIVATE_KEY is set the bundle is encrypted+signed
// (which also needs CAPGO_PUBLIC_KEY, since @capgo/cli reads the public half
// from capacitor.config); an app built WITH a public key rejects an unsigned
// bundle, so the plain path is dev-only.
//
// Env:
//   CAPGO_PRIVATE_KEY / CAPGO_PUBLIC_KEY  Encryption V2 keypair. Both enable signing.
//   CAPGO_MIN_NATIVE_VERSION              Minimum native app version this web bundle
//                                         supports; bump only when a matching App
//                                         Store build ships. Defaults to <major>.0.0.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const webappDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const distDir = path.join(webappDir, "dist")
// Output OUTSIDE dist so zipping dist never recursively includes the artifacts.
const outDir = path.join(webappDir, "live-updates-dist")

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

const capgo = (args) =>
  execFileSync("pnpm", ["exec", "capgo", ...args], {
    cwd: webappDir,
    encoding: "utf8",
  })

const zipName = `apollon-${version}.zip`
const zipPath = path.join(outDir, zipName)

// 1. Package the built web assets and get Capgo's checksum. `--key-v2` selects
// the Encryption V2 pipeline the app's `publicKey` verifies against.
const { checksum: plainChecksum } = JSON.parse(
  capgo([
    "bundle",
    "zip",
    "--path",
    distDir,
    "--name",
    zipPath,
    "--json",
    "--no-code-check",
    "--key-v2",
  ])
)

let checksum = plainChecksum
let sessionKey

const privateKey = process.env.CAPGO_PRIVATE_KEY
if (privateKey) {
  if (!process.env.CAPGO_PUBLIC_KEY) {
    console.error(
      "build-live-update: CAPGO_PRIVATE_KEY set but CAPGO_PUBLIC_KEY is not."
    )
    process.exit(1)
  }
  // 2. Encrypt+sign: emits <zip>_encrypted.zip, the SIGNED checksum the plugin
  // verifies with the public key, and the ivSessionKey the app needs to decrypt.
  const encrypted = JSON.parse(
    capgo([
      "bundle",
      "encrypt",
      zipPath,
      plainChecksum,
      "--key-data",
      privateKey,
      "--json",
    ])
  )
  checksum = encrypted.checksum
  sessionKey = encrypted.ivSessionKey
  // @capgo/cli writes the encrypted artifact next to the input as
  // `<zip>_encrypted.zip`; serve it under the clean bundle name.
  fs.rmSync(zipPath)
  fs.renameSync(`${zipPath}_encrypted.zip`, zipPath)
} else {
  console.warn(
    "build-live-update: CAPGO_PRIVATE_KEY unset — emitting a PLAIN bundle. " +
      "An app built with CAPGO_PUBLIC_KEY will reject it; do not use in production."
  )
}

const manifest = {
  version,
  url: `https://apollon.aet.cit.tum.de/live-updates/${zipName}`,
  checksum,
  minNativeVersion,
  ...(sessionKey ? { sessionKey } : {}),
}
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
)

console.log(
  `build-live-update: ${zipName} (${sessionKey ? "encrypted+signed" : "PLAIN"}), ` +
    `minNativeVersion ${minNativeVersion}`
)
