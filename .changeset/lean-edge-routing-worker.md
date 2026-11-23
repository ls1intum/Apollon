---
"@tumaet/apollon": patch
"@tumaet/webapp": patch
---

Large diagrams start their background edge routing sooner: the helper that routes edges off the main thread is now about 28% smaller to download, because it no longer carries the canvas's pan-and-zoom code it never uses.
