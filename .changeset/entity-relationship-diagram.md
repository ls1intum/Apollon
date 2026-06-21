---
"@tumaet/apollon": minor
"@tumaet/webapp": minor
---

Add two first-class **Entity-Relationship diagram** types, covering both notations taught and used in practice:

- **Entity-Relationship (Chen):** strong and weak entities (double border), regular and identifying relationships (diamond / double diamond), and attributes as ellipses with key (underline), partial-key (dashed underline), multivalued (double ellipse) and derived (dashed ellipse) decorations. Entity↔relationship connectors carry a free-text cardinality label with quick presets for both Chen ratio (`1`/`N`/`M`) and `(min,max)`, plus a participation toggle (total participation draws a double line). The editor only lets you draw structurally valid connections and picks the right connector vs. link edge automatically, including on reconnection.
- **Entity-Relationship (Crow's Foot):** the Mermaid/IE-style notation — entity tables whose columns are listed as rows, related by step-routed lines (the same orthogonal routing, bend points and midpoint dragging as class edges) with crow's-foot cardinality markers at each end (zero/one/many) and solid (identifying) or dashed (non-identifying) lines.
