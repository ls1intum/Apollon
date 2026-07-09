import * as vscode from "vscode"
import { ApollonEditorProvider } from "./apollonEditorProvider"
import { exportDiagram, newDiagram } from "./commands"
import { DiagramTreeProvider } from "./diagramTree"

export function activate(context: vscode.ExtensionContext) {
  const provider = new ApollonEditorProvider(context.extensionUri)
  const tree = new DiagramTreeProvider()

  context.subscriptions.push(
    tree,
    vscode.window.registerCustomEditorProvider(
      ApollonEditorProvider.viewType,
      provider,
      {
        // The model is reconstructable from the document, but the viewport,
        // selection and in-flight drag are not — losing them on a tab switch
        // would make the editor feel broken.
        webviewOptions: { retainContextWhenHidden: true },
        // Two live canvases on one document would sync only through the text
        // round-trip. Revisit if there is ever a reason to want it.
        supportsMultipleEditorsPerDocument: false,
      }
    ),
    vscode.window.registerTreeDataProvider("apollon.diagrams", tree),
    vscode.commands.registerCommand("apollon.newDiagram", newDiagram),
    vscode.commands.registerCommand("apollon.refreshDiagrams", () =>
      tree.refresh()
    ),
    vscode.commands.registerCommand(
      "apollon.exportDiagram",
      async () => await exportDiagram(provider)
    )
  )
}

export function deactivate() {}
