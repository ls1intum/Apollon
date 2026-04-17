# Apollon for VS Code

Model UML diagrams directly in Visual Studio Code using the [Apollon](https://github.com/ls1intum/Apollon) editor. Diagrams are stored as `.apollon` files so you can version them in Git alongside your source.

## Install

- **Marketplace:** search for _Apollon_ in the Extensions view, or install `tumaet.apollon-vscode` from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tumaet.apollon-vscode).
- **CLI:** `code --install-extension tumaet.apollon-vscode`

## Use

1. Create a new file with the `.apollon` extension, or open an existing one.
2. Click **Open Diagram** in the editor title bar, or pick a diagram type from the Apollon view in the Activity Bar.
3. Edit. Changes are saved back to the `.apollon` file on disk.

Supported diagram types match the [`@tumaet/apollon`](https://www.npmjs.com/package/@tumaet/apollon) library: class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and SFC.

## Links

- Source and issue tracker: <https://github.com/ls1intum/Apollon>
- Underlying library: [`@tumaet/apollon`](https://www.npmjs.com/package/@tumaet/apollon)
- Developer notes: [`README.dev.md`](./README.dev.md)

## License

MIT — see the monorepo [LICENSE](../LICENSE).
