---
"@tumaet/apollon": patch
---

Fixes the edit popover, selects, color and tag pickers, tooltips and the palette drag ghost being hidden or unclickable when the editor is embedded in a dialog. Inside a modal host layer (an `aria-modal` dialog, a native modal `<dialog>`, an open popover, or fullscreen) they now open within that layer, so they stay visible, keep focus under the dialog's focus trap, land under the cursor while dragging, and stay reachable for screen readers. Everywhere else they stack above the host page's overlays; a host with a layer above 9999 can lift them with the `--apollon-z-floating` CSS variable.
