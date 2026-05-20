---
id: vanilla
title: Vanilla JS / CDN
description: Drop Apollon into a plain HTML page with one script tag.
---

# Vanilla JS / CDN

The standalone subpath works as a single ESM module loaded directly from a CDN.

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@tumaet/apollon/dist/assets/style.css"
/>
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import {
    ApollonEditor,
    ApollonMode,
    Locale,
    UMLDiagramType,
  } from "https://unpkg.com/@tumaet/apollon"

  const editor = new ApollonEditor(document.getElementById("apollon"), {
    type: UMLDiagramType.ClassDiagram,
    mode: ApollonMode.Modelling,
    locale: Locale.en,
  })
</script>
```

Same API as in any other framework.
