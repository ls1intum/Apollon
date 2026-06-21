---
"@tumaet/server": patch
---

Server-rendered diagram images and PDFs now include edges that connect to a node's in-between anchor points. Previously such an edge was silently dropped from the export, so a diagram could come out with its boxes but a missing connection.
