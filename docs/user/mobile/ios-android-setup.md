# iOS and Android Setup

This guide covers setting up the mobile applications for iOS and Android using Capacitor.

## Prerequisites

Make sure you have completed the [initial setup](../getting-started/setup) first.

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
