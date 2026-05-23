---
id: vanilla
title: Vanilla JS / CDN
description: Drop Apollon into a plain HTML page with one script tag.
---

# Vanilla JS / CDN

The standalone subpath works as a single ESM module loaded directly from a CDN.
No build step, no bundler.

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@tumaet/apollon@4.4.0/dist/assets/style.css"
/>
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import {
    ApollonEditor,
    ApollonMode,
    Locale,
    UMLDiagramType,
  } from "https://unpkg.com/@tumaet/apollon@4.4.0"

  const editor = new ApollonEditor(document.getElementById("apollon"), {
    type: UMLDiagramType.ClassDiagram,
    mode: ApollonMode.Modelling,
    locale: Locale.en,
  })
</script>
```

Same API as in any other framework.

:::warning Pin the CDN version
Both URLs above pin an exact version (`@4.4.0`). An **unpinned** URL —
`unpkg.com/@tumaet/apollon` with no version — always resolves to the latest
release, so a new major can land on the next page refresh and break your embed
without any change on your side. Always pin to a known-good version and bump it
deliberately.
:::

The container must have an explicit height, or the editor renders blank — see
[Troubleshooting](/library/troubleshooting).
