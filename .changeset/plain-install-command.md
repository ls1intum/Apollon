---
"@tumaet/apollon": patch
---

Correct the install guidance on the npm README: `npm install @tumaet/apollon` is all npm 7+, pnpm 8+, and Bun need (they auto-install the required peers); the explicit peer list is only for Yarn, which never installs peers. Also clarify that the PNG/PDF renderers are optional dependencies that install automatically, not "optional peers" the consumer must add.
