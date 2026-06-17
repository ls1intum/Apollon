---
"@tumaet/webapp": patch
---

Simplify PPTX text positioning. `@tumaet/apollon`'s `compat` export now resolves `dominant-baseline` into an explicit baseline `y`, so the PPTX exporter no longer needs its empirically-tuned `TEXT_BASELINE_OFFSET_PX` fudge — text-box placement is derived directly from the baseline and cap height.
