# Apollon for VS Code

Model UML diagrams directly in Visual Studio Code using the [Apollon](https://github.com/ls1intum/Apollon) editor. Diagrams are stored as `.apollon` files so you can version them in Git alongside your source.

## Install

- **Marketplace:** search for _Apollon_ in the Extensions view, or install `aet-tum.apollon-extension` from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension).
- **CLI:** `code --install-extension aet-tum.apollon-extension`

## Use

1. Run **Apollon: New Diagram** from the Command Palette, or press **+** in the Apollon view in the Activity Bar.
2. Open any `.apollon` file to edit it on the canvas. It behaves like any other editor: <kbd>Cmd/Ctrl+S</kbd> saves, the tab shows unsaved changes, and <kbd>Cmd/Ctrl+Z</kbd> undoes.
3. To read or diff the raw JSON, use **Reopen Editor With… → Text Editor**.

Supported diagram types match the [`@tumaet/apollon`](https://www.npmjs.com/package/@tumaet/apollon) library: class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and SFC.

## Export

Run **Apollon: Export Diagram as Image** to write a sibling `.svg` or `.png` next to the diagram. To do it on every save, set `apollon.autoExport` to `svg` or `png`.

## Links

- Source and issue tracker: <https://github.com/ls1intum/Apollon>
- Underlying library: [`@tumaet/apollon`](https://www.npmjs.com/package/@tumaet/apollon)
- Developer notes: [`README.dev.md`](./README.dev.md)

## License

MIT — see the monorepo [LICENSE](../LICENSE).
