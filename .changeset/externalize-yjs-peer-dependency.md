---
"@tumaet/apollon": minor
---

Two packaging improvements for embedding hosts. First, `yjs` and `y-protocols` are now required peer dependencies instead of being bundled, so your app and Apollon share a single Yjs instance — no duplicate payload and no cross-instance document errors. Second, a new `@tumaet/apollon/external` entry exposes the same imperative `ApollonEditor` API as the default entry but leaves **every** dependency external (React, MUI, emotion, xyflow, @dnd-kit, zustand, uuid, @chenglou/pretext, …) — so a bundler host of any framework resolves and de-duplicates each one from its own `node_modules` and gets full supply-chain / SBOM visibility, instead of a copy inlined invisibly into the bundle. The default `@tumaet/apollon` (self-contained) and `@tumaet/apollon/react` entries are unchanged. Action required only if you adopt the new entry or the Yjs peer: install the corresponding peers (most package managers do this automatically).
