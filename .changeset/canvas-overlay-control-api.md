---
"@tumaet/apollon": minor
---

Add a canvas overlay/control API so host applications can mount their own floating controls — toolbars, side panels, banners — directly inside the editor, in any corner or edge region. Registered chrome is collision-free and the diagram automatically makes room for it, so the canvas stays usable beneath it. The editor's built-in chrome (element palette, zoom/undo controls, minimap) is restyled onto one shared Liquid-Glass surface — translucent tint floor, backdrop blur, concentric radii and consistent elevation — that adapts to light and dark and honours reduced-transparency, increased-contrast and reduced-motion preferences. An untitled diagram now keeps an empty title (consumers can show their own placeholder) instead of being auto-named "Untitled Diagram".
