---
"@tumaet/webapp": patch
---

Simplify PPTX text positioning. `@tumaet/apollon`'s `compat` export now resolves `dominant-baseline` into an explicit baseline `y`, so the PPTX exporter no longer needs its empirically-tuned `TEXT_BASELINE_OFFSET_PX` fudge — the text-box top is derived directly from the resolved baseline and the box height.
