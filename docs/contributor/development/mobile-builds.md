---
id: mobile-builds
title: Mobile builds (iOS / Android)
description: Build the Apollon webapp as a Capacitor native shell for iOS and Android.
---

# iOS and Android

This guide covers building the Apollon webapp as a Capacitor native shell for iOS and Android. It is aimed at contributors; end users get the standalone web app at `https://apollon.aet.cit.tum.de`.

## Prerequisites

Complete the [contributor setup](/contributor/) first.

## Setup Instructions

1. **Install the latest packages**

   ```bash
   pnpm install
   ```

2. **Build the application**

   ```bash
   pnpm build
   ```

3. **For the first time, generate ios and android folder:**

   For iOS:

   ```bash
   pnpm capacitor:add:ios
   ```

   For Android:

   ```bash
   pnpm capacitor:add:android
   ```

4. **Generate assets:**

   ```bash
   pnpm capacitor:assets:generate:ios       # or :generate:android
   ```

5. **Sync the files**

   ```bash
   pnpm capacitor:sync
   ```

6. **Open the App**

   For iOS:

   ```bash
   pnpm capacitor:open:ios
   ```

   For Android:

   ```bash
   pnpm capacitor:open:android
   ```

## App Store screenshots and metadata

App Store screenshots are captured from the real Capacitor app with XCUITest,
not from a browser mock. The Fastlane snapshot configuration launches an
iPhone 17 Pro Max in portrait and an iPad Pro 13-inch in landscape, resets app
data, seeds this repository's Playwright README-hero fixture plus two existing
visual-test fixtures into the temporary screenshot build, and captures the
editor, gallery, diagram types, dark appearance, and export formats. The seed
does not add or change any template in the release app.

Use a current Ruby 3 installation rather than macOS's system Ruby, then install
the Ruby dependencies once:

```bash
cd standalone/webapp
bundle install
```

Then capture a fresh set from the repository root:

```bash
pnpm appstore:screenshots
```

Each run keeps two exact-size, RGB screenshot sets that are intentionally
ignored by Git:

- untouched Simulator masters in
  `standalone/webapp/fastlane/screenshots/en-US/`; and
- App Store presentation candidates with official Apple product bezels,
  concise benefit headlines, and branded backgrounds in
  `standalone/webapp/fastlane/screenshots-framed/en-US/`.

Open `standalone/webapp/fastlane/screenshots-review.html` to compare every raw
and framed image side by side at full resolution. Recompose the framed set
without rerunning the simulators with `pnpm appstore:screenshots:framed`.

For a quick browser-only preview while iterating on the capture sequence, run
`pnpm --filter @tumaet/webapp appstore:screenshots:preview`. Preview images are
kept separately in
`standalone/webapp/fastlane/screenshots-preview/en-US/` and are never uploaded.

The version metadata committed under
`standalone/webapp/fastlane/metadata/` includes the App Store name, subtitle,
description, keywords, release notes, and support, marketing, and privacy URLs.

The manual `ios-release` GitHub Actions workflow provides three destinations:

- `testflight` uploads only the signed build to TestFlight.
- `app-store-assets` regenerates and uploads metadata and screenshots without a
  binary.
- `app-store` uploads the build, metadata, and screenshots. Submission for
  review remains opt-in.

The workflow asks whether to upload the raw or framed set. The approved,
official-bezel presentation is the default; the untouched raw masters remain
available as an explicit fallback.

### Official device bezels

Apple licenses its current product-bezel artwork rather than distributing it as
open-source material. An authorized Apple Developer Program representative must
download and accept the terms for the current iPhone 17 and iPad Pro product
bezels from [Apple Design Resources](https://developer.apple.com/design/resources/).
Do not commit or redistribute the source artwork.

Export the front-facing Deep Blue iPhone 17 Pro Max bezel and the front-facing,
landscape Space Black iPad Pro M5 bezel as transparent PNGs, then place them at:

```text
standalone/webapp/fastlane/device-frames/iphone-17-pro-max-deep-blue.png
standalone/webapp/fastlane/device-frames/ipad-pro-m5-space-black-landscape.png
```

That directory is ignored by Git. `pnpm appstore:screenshots:framed` fails
closed when either authorized asset is missing. The compositor preserves the
bezel artwork's proportions, adds no effects to it, places copy beside it, and
keeps the flattened outputs opaque and at their exact App Store dimensions.

After the license has been accepted, the local setup can also be reproduced
directly from Apple's pinned downloads:

```bash
cd standalone/webapp
pnpm appstore:screenshots:prepare-frames
```

The script downloads the current Apple packages, verifies the package and
selected PNG checksums, accepts the already-approved bundled license in the
macOS mount dialog, and extracts only the two ignored assets. A changed Apple
package fails checksum validation before mounting so that updated artwork and
terms receive an explicit review.

The manual iOS release workflow runs this automatically whenever `framed` is
selected, captures and composes both device sets, verifies the output through
Fastlane, and publishes the raw/framed comparison page as the
`ios-app-store-screenshot-review` workflow artifact.

See
[`standalone/webapp/fastlane/APP_STORE_READINESS.md`](https://github.com/ls1intum/Apollon/blob/main/standalone/webapp/fastlane/APP_STORE_READINESS.md)
for the final release checklist and the App Store Connect fields that cannot be
safely automated.

## Over-the-air live updates

The mobile app can update its web bundle (HTML/CSS/JS only) without an App Store
review, using [`@capgo/capacitor-updater`](https://capgo.app/) in **manual mode,
fully self-hosted and first-party**. This is App-Store-compliant: only
WebKit-interpreted code is updated, never native code
([Apple 2.5.2](https://developer.apple.com/app-store/review/guidelines/)).

### Architecture (deploy == OTA publish)

The mobile app's web bundle **is** the same `dist/` the web app already deploys,
so there is one cadence — the production deploy — and the OTA payload is a
byproduct of it. Nothing new is hosted and the collaboration server is untouched:

- The `ios-live-update` workflow builds `dist/`, packages it into a versioned,
  **signed** `apollon-<version>.zip` plus a `manifest.json`
  (`standalone/webapp/scripts/build-live-update.mjs`), and copies both to
  `/opt/apollon/app/live-updates` on the prod VM.
- The **webapp container's nginx** serves that directory at
  `https://apollon.aet.cit.tum.de/live-updates/` (manifest `no-cache`, zips
  immutable, CORS). Traefik already routes the host to it — no proxy change.
- On launch the app (`standalone/webapp/src/services/liveUpdate.ts`) fetches the
  manifest, refuses anything below its `minNativeVersion`, and only downloads a
  strictly-newer bundle, applying it on the **next cold start**.

### Security — signing is the boundary

Bundles are signed with **Capgo Encryption V2**: the private key lives only in
CI, the public key is baked into the app, and the plugin **rejects any bundle
whose signature does not verify** — so a compromised update host cannot ship
malicious code. A bundle that fails to call `notifyAppReady()` within
`appReadyTimeout` is **automatically rolled back**. Because signing is the
security boundary, serving from the app's own static host is safe.

### Native-version gating

The web build advances with the server on every deploy, so a bundle must never
land on an older native shell that lacks a required native/plugin or server
change. Each bundle stamps `minNativeVersion`; set the `CAPGO_MIN_NATIVE_VERSION`
CI variable to the native version currently in the App Store and bump it **only**
when a matching native build ships. `resetWhenUpdate` (on) also discards OTA
bundles when a new native build is installed.

### Configuration (already provisioned for `ls1intum/Apollon`)

The signing keypair and wiring are in place; nothing here is manual per release.

- **Signing keypair** — an Encryption V2 keypair was generated with
  `npx @capgo/cli key create`. The private half is the `CAPGO_PRIVATE_KEY`
  Production secret (used only by `ios-live-update`); the public half is the
  `CAPGO_PUBLIC_KEY` repo variable, baked into the app during `cap sync` so the
  updater enforces signatures. The private key is **not** in the repo.
- **Transport** — `ios-live-update` reuses the existing deploy identity and
  bastion (`VM_SSH_PRIVATE_KEY`, `VM_HOST`, `VM_USERNAME`, `DEPLOYMENT_GATEWAY_*`)
  to copy the bundle to `/opt/apollon/app/live-updates` (owned by
  `github_deployment`, world-readable so the container's nginx can serve it).
- **Wiring** — `deploy-prod` calls `ios-live-update` after `deploy-app` when the
  `ENABLE_LIVE_UPDATE` variable is `true`, so a production deploy also publishes
  the matching bundle. `CAPGO_MIN_NATIVE_VERSION` (repo variable) is the native
  version gate — bump it only when a matching App Store build ships.

The next production deploy publishes the first bundle. Rotating the keypair means
re-running `key create`, updating both `CAPGO_*` keys, and shipping a new native
build (the public key is baked into the binary). For a fork, set the four
variables/secrets above and flip `ENABLE_LIVE_UPDATE`; without them the feature
is inert — the app checks the manifest, gets a 404, and keeps its shipped bundle.
