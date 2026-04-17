# Apollon

[![Latest version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![Documentation Status](https://readthedocs.org/projects/apollon/badge/?version=latest)](https://apollon.readthedocs.io/en/latest/?badge=latest)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/ff48bab36a924471abcf61566563ffe6)](https://app.codacy.com/gh/ls1intum/Apollon)
[![Codacy Coverage](https://app.codacy.com/project/badge/Coverage/9bbbff1e8475480d92c80615ac2eddf6)](https://app.codacy.com/gh/ls1intum/Apollon)

A UML modeling editor written in React and TypeScript.

> This package replaces the legacy [`@ls1intum/apollon`](https://www.npmjs.com/package/@ls1intum/apollon). The legacy package is no longer maintained — please migrate to `@tumaet/apollon`.

## Main Features

### Easy-to-use editor

The user interface of Apollon is simple to use. It works just like any other office and drawing tool that most users are familiar with.

- Select the diagram type you want to draw from the `Diagram Type` menu. This selection determines the availability of elements that the user can use while drawing their diagram, making it easier for users who are newly introduced to modeling.
- Adding an element is as easy as dragging it from the elements menu and dropping it onto the canvas. So is drawing the connection between elements — simply drag and connect two or more elements.
- Edit the text of any element by double-clicking on it. An easy-to-use popover will allow you to do so.
- Supports dark and light themes for the editor.
- Supports exporting the entire diagram or just selected elements of it (SVG, PNG, PDF, JSON).
- Real-time collaboration powered by [Yjs](https://yjs.dev/) CRDTs.

### Flexible layout while drawing

Apollon allows users to lay out their diagrams flexibly. Keyboard shortcuts copy, paste, delete, and move elements across the canvas. Connection paths are routed automatically, but waypoints can be dragged to adjust the routing manually. Elements can be resized from any corner.

### Infinite canvas

Apollon provides an infinite canvas, so you will never feel out of space while drawing your diagram. Positioning rulers (grid) serve as a guideline to place elements, and all elements snap perfectly to the grid.

### Wide range of UML diagrams

Apollon currently supports **13** diagram types:

- `Class Diagram`
- `Object Diagram`
- `Activity Diagram`
- `Use Case Diagram`
- `Communication Diagram`
- `Component Diagram`
- `Deployment Diagram`
- `Petri Net`
- `Reachability Graph`
- `Syntax Tree`
- `Flowchart`
- `BPMN`
- `SFC` (Sequential Function Chart)

### Integrate Apollon with other software

Apollon can be embedded into any JavaScript/TypeScript application. It is the modeling editor used by the interactive learning platform [Artemis](https://artemis.tum.de/). A standalone web version of Apollon is also available — see the [Apollon monorepo](https://github.com/ls1intum/Apollon) for source and deployment instructions.

## Installation

Install the `@tumaet/apollon` npm package using your package manager of choice:

```sh
npm install @tumaet/apollon
```

```sh
yarn add @tumaet/apollon
```

```sh
pnpm add @tumaet/apollon
```

## Usage

Import the `ApollonEditor` class (named export) from the package:

```ts
import { ApollonEditor } from "@tumaet/apollon"
```

Get hold of a DOM node and mount a new instance of the Apollon editor into it:

```ts
const container = document.getElementById("apollon")!
const editor = new ApollonEditor(container, {
  // optional ApollonOptions — diagram type, model, theme, locale, etc.
})
```

To unmount the editor instance, call its `destroy()` method:

```ts
editor.destroy()
```

For a complete overview of the API, refer to the TypeScript declarations shipped with the package (`dist/index.d.ts`) and the [documentation](https://apollon.readthedocs.io/en/latest/).

## Peer requirements

`@tumaet/apollon` ships as an ES module and is built against:

- React 18
- React DOM 18

Make sure your host application provides these as dependencies.

## Documentation

Full documentation — setup, API reference, diagram guides, deployment — is available at:

**[https://apollon.readthedocs.io/en/latest/](https://apollon.readthedocs.io/en/latest/)**

## Development

The library lives in the [Apollon monorepo](https://github.com/ls1intum/Apollon). See the monorepo [README](https://github.com/ls1intum/Apollon#readme) for workspace setup, and the [contributing guide](https://apollon.readthedocs.io/en/latest/contributing.html) for coding conventions and pull request workflow.

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
