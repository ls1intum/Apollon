---
id: overview
title: Overview
description: What Apollon is, what you can draw with it, and which of the three ways to use it fits you.
slug: /
---

# Overview

Apollon is an open-source UML and modeling editor for the web. You draw diagrams
in the browser, collaborate in real time, and export to SVG, PNG, PDF, PPTX, or JSON.
There is nothing to install to get started.

## What you can draw

Apollon supports 13 diagram types:

- Class
- Object
- Activity
- Use Case
- Communication
- Component
- Deployment
- Petri Net
- Reachability Graph
- Syntax Tree
- Flowchart
- BPMN
- SFC

Any diagram exports to SVG, PNG, PDF, PPTX, or JSON. JSON round-trips — re-import
it to keep editing. Real-time collaboration is optional and runs over WebSockets.

## Which way to use Apollon

Apollon ships in three forms. Pick the one that matches your context.

### Hosted web app

Open [apollon.aet.cit.tum.de](https://apollon.aet.cit.tum.de) and start drawing.
No install, no account. Diagrams persist in your browser and can be shared by
URL. Use this when you want to draw and share a diagram with no install.

### VS Code extension

Install the extension if you want diagrams to live next to your code. It stores
each diagram as a plain `.apollon` file in your repository, so diagrams are
versioned and reviewed like any other source.

### Embeddable library

`@tumaet/apollon` is published on npm. Embed the editor in your own product when
you need UML modeling inside an existing application.

```sh
npm install @tumaet/apollon react react-dom @xyflow/react yjs y-protocols
```

| You want to...                                  | Use this           |
| ----------------------------------------------- | ------------------ |
| Draw a diagram right now, share it by URL       | Hosted web app     |
| Keep diagrams in version control with your code | VS Code extension  |
| Add a UML editor to your own application        | Embeddable library |

## Next steps

- [Get Apollon](/user/getting-started/setup) — set up the hosted app, the VS
  Code extension, or a self-hosted instance.
- [Library docs](/library/) — the embedding API for `@tumaet/apollon`.
- [Contributor docs](/contributor/) — build Apollon from source and contribute.
