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
   pnpm capacitor:assets:generate:ios
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
