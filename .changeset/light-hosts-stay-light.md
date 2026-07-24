---
"@tumaet/apollon": patch
---

Stop mutating the host page's color scheme. `style.css` declared `color-scheme: light dark` on `:root`, so any host that imports the editor CSS and leaves its own `html`/`body` backgrounds transparent (the Docusaurus docs site does) rendered a browser-picked dark canvas behind light-themed text for dark-preference visitors. The declaration is now scoped to the editor mount and `[data-theme]` subtrees; host pages keep full control of their document root.
