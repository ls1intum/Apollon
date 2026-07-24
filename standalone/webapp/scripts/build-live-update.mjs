// Produce the over-the-air live-update artifacts from an already-built `dist/`:
//   live-updates-dist/apollon-<version>.zip   — the web bundle (encrypted in prod)
//   live-updates-dist/manifest.json           — the first-party update pointer
//
// The ios-live-update workflow runs this (with the Capgo keys) and copies the
// output to the directory the webapp nginx serves at /live-updates/, so a normal
// deploy also publishes the matching bundle. nginx serves it (see nginx.conf);
// the app checks the manifest (see src/services/liveUpdate.ts).
//
// Signing/encryption (Capgo Encryption V2) is the security boundary — with it,
// the host need not be trusted. When CAPGO_PRIVATE_KEY is set the bundle is
// encrypted+signed with @capgo/cli (which also needs CAPGO_PUBLIC_KEY in the
// env, because it reads the public half from capacitor.config); without it a
// PLAIN bundle is emitted for local/dev use and a warning is logged. An app
// built WITH a public key rejects a plain bundle, so never mix the two in prod.
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
  execFileSync("npx", ["--no-install", "@capgo/cli", ...args], {
    cwd: webappDir,
    encoding: "utf8",
  })

const zipName = `apollon-${version}.zip`
const zipPath = path.join(outDir, zipName)

// 1. Package the built web assets and get Capgo's checksum for them.
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
