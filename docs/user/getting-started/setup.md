---
id: setup
title: Get Apollon
description: How to use Apollon on the web, iPhone and iPad, VS Code, or your own server.
---

# Get Apollon

Choose the version that matches your context — see the
[Overview](/user/) if you are still deciding.

## Hosted webapp

Open <https://apollon.aet.cit.tum.de> in a browser. No install, no account. Diagrams persist in your browser and can be shared by URL. Any current browser works — see [Requirements](/user/getting-started/requirements).

## iPhone and iPad

Install [Apollon - UML Modeling Editor](https://apps.apple.com/app/id6474762031)
from the App Store. The iOS app works without an account, keeps local diagrams
on your device, and supports both iPhone and iPad.

If you used the previous native iOS app, install the new release as an update
instead of deleting the app. The in-place update lets Apollon import compatible
locally saved diagrams. See [Support](/user/support) before updating if the
diagrams are important and not backed up.

## VS Code extension

Install **Apollon** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension) (or [Open VSX](https://open-vsx.org/extension/aet-tum/apollon-extension)). Diagrams live next to your code as `.apollon` files.

## Self-host

Run the standalone yourself with Docker. See [Deployment → GitHub Actions](/contributor/deployment/github-actions) for the supported topology and required environment variables, and [Contributor setup](/contributor/) for a local dev stack.

## Embed in your own product

Apollon is published as an npm library, `@tumaet/apollon`. See the [library docs](/library/) for the embedding guides.
