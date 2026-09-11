# Apollon for IntelliJ IDEA / WebStorm

Model UML diagrams directly in IntelliJ IDEA or WebStorm using the [Apollon](https://github.com/ls1intum/Apollon) editor. Diagrams are stored as `.apollon` files so you can version them in Git alongside your source.

> **Status: functional, not yet published.** This plugin reads and writes `.apollon` files, follows the IDE theme, and exports SVG/PNG images. It isn't on the JetBrains Marketplace yet — see [`README.dev.md`](./README.dev.md) to build and run it from source.

## Install

Not yet published to the JetBrains Marketplace. See [`README.dev.md`](./README.dev.md) to build and run it from source.

## Features

- Open a `.apollon` file to edit its diagram on the Apollon canvas, or use **Tools → Apollon → New Apollon Diagram…** to create one.
- Edits sync to the underlying `Document` (undo, save, and version control all work normally); the canvas updates in turn when the file changes externally.
- The canvas follows the IDE's editor color scheme and Swing look-and-feel, live.
- **Tools → Apollon → Export Apollon Diagram…** renders the focused diagram to a sibling SVG or PNG; auto-export on save is configurable per-project under **Settings → Tools → Apollon**.
- The **Apollon** tool window lists every `.apollon` file in the project for quick navigation.

## Use

Supported diagram types match the [`@tumaet/apollon`](https://www.npmjs.com/package/@tumaet/apollon) library: class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and sequential function chart.
