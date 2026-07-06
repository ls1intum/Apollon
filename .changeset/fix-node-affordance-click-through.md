---
"@tumaet/apollon": patch
---

Selecting a node no longer blocks clicks on a node overlapping it: the selected node's connection points and resize handles stick out past its edges, and they used to swallow clicks meant for the node beneath. They now only capture while you hover the node (which is how you reach for them anyway), so an overlapping node stays selectable everywhere it's visible.
