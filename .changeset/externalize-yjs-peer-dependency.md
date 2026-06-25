---
"@tumaet/apollon": minor
---

Apollon no longer bundles its own copy of Yjs: `yjs` and `y-protocols` are now required peer dependencies, so your app and Apollon share a single Yjs instance instead of shipping — and running — two, which removes both the duplicate payload and the cross-instance document errors that two private Yjs copies can cause. Published builds now also ship source maps, so the dependencies Apollon still bundles are visible to your bundle analyzer and SBOM tooling. Action required: make sure `yjs` and `y-protocols` are installed in your app (most package managers add missing peers automatically).
