---
"@tumaet/apollon": minor
"@tumaet/webapp": minor
---

Add a first-class **Entity-Relationship (Chen) diagram** type. Select `EntityRelationship` to model with the full Chen notation: strong and weak entities (double border), regular and identifying relationships (diamond / double diamond), and attributes as ellipses with key (underline), partial-key (dashed underline), multivalued (double ellipse) and derived (dashed ellipse) decorations. Entity↔relationship connectors carry a free-text cardinality label with quick presets for both Chen ratio (`1`/`N`/`M`) and `(min,max)` notations, plus a participation toggle (total participation draws a double line). The editor only lets you draw structurally valid connections (entities link to relationships, attributes hang off an owner) and picks the right connector vs. link edge automatically — including on reconnection.
