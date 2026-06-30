---
id: vanilla
title: Vanilla JS / CDN
description: Drop Apollon into a plain HTML page with one script tag.
---

# Vanilla JS / CDN

Apollon loads directly from a CDN as an ESM module. No build step, no bundler.

Apollon externalizes its peers (`react`, `react-dom`, `@xyflow/react`, `yjs`,
`y-protocols`), but on the CDN path esm.sh resolves and serves them from the
import URL automatically — there is nothing extra to load. (With a bundler you
install the peers yourself — see [Install](/library/embedding/install).)

```html
<link rel="stylesheet" href="https://esm.sh/@tumaet/apollon@4.9.0/style.css" />
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import { ApollonEditor } from "https://esm.sh/@tumaet/apollon@4.9.0"

  const saved = localStorage.getItem("diagram")
  const editor = new ApollonEditor(document.getElementById("apollon"), {
    model: saved ? JSON.parse(saved) : undefined,
  })

  editor.subscribeToModelChange((model) => {
    localStorage.setItem("diagram", JSON.stringify(model))
  })

  // editor.destroy() when you're done.
</script>
```

Refresh the page and the diagram is still there. Defaults — class diagram,
modelling mode, English — fill in for everything the example doesn't pass.

## Why esm.sh

[esm.sh](https://esm.sh/) reads the package's `exports` map and serves the
right entry for your import path — including the published `./style.css`
subpath. The previous `unpkg.com/.../dist/assets/style.css` URL was a deep
path into the tarball's build output; that's an implementation detail that
can shift between releases. [jsDelivr's `esm.run`](https://www.jsdelivr.com/esm)
is an equivalent substitute.

:::warning Pin the CDN version
Both URLs above pin an exact version. An **unpinned** URL —
`@tumaet/apollon` with no version — always resolves to the latest release, so
a new major can land on the next page refresh and break your embed without
any change on your side. Always pin to a known-good version and bump it
deliberately.
:::

The container must have an explicit height, or the editor renders blank — see
[Troubleshooting](/library/troubleshooting).

## Configuration

Pass options as the constructor's second argument:

```js
import {
  ApollonEditor,
  ApollonMode,
  UMLDiagramType,
} from "https://esm.sh/@tumaet/apollon@4.9.0"

const editor = new ApollonEditor(document.getElementById("apollon"), {
  type: UMLDiagramType.BPMN,
  mode: ApollonMode.Assessment,
  collaborationEnabled: true,
})
```

See the [API reference](/library/api) for the full `ApollonOptions` table and
every imperative method on the `ApollonEditor` instance.
