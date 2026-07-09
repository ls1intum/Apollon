---
"@tumaet/apollon": patch
---

Keep the palette drag ghost themed when the editor is themed by its own mount node. The ghost portals to `document.body` to track the cursor in viewport coordinates, which put it outside the subtree that scopes the editor's tokens — so `<Apollon dataTheme="dark">` dragged a light-on-white shape across a dark canvas. It now carries the theme it was grabbed under, whether that came from `dataTheme`, from a `theme` override, or from a host stylesheet. Hosts that theme the document root were never affected.
