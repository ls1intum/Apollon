---
"@tumaet/apollon": patch
---

Host controls placed in the chrome now hold their position. The bottom-centre
region spans the canvas so a wide control can size itself against the available
width instead of being squeezed around its centre, the side rails no longer
reserve their corner gap twice, and a control that animates in is measured by
its settled height rather than its mid-animation paint box — so neighbouring
controls stop drifting when a host panel opens, closes, or first mounts.
