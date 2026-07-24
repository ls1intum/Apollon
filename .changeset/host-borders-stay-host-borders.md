---
"@tumaet/apollon": patch
---

Stop repainting the host page's borders. Importing the editor's `style.css` reset the border colour of every element on the page, so the host's own inputs, selects, buttons and fieldsets lost the browser's neutral grey and took on the surrounding text colour — near-black on a light page, stark white on a dark one. The reset now applies only to the editor's own controls.
