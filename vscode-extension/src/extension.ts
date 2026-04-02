import * as vscode from "vscode"
import * as fs from "fs"

import MenuProvider from "./menu-provider"

export function activate(context: vscode.ExtensionContext) {
  const provider = new MenuProvider(context.extensionUri)

  const disposable = vscode.commands.registerCommand(
    "apollonEditor.openDiagram",
    async () => await openDiagram(provider)
  )

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("menu", provider)
  )
  context.subscriptions.push(disposable)

  associateApollonType()
}

/**
 * Opens the currently viewed .apollon diagram inside of the Apollon editor
 *
 * @param provider
 */
async function openDiagram(provider: MenuProvider) {
  const activeEditor = vscode.window.activeTextEditor
  if (activeEditor) {
    const diagramPath = activeEditor.document.uri.fsPath
    const diagramName = diagramPath.substring(diagramPath.lastIndexOf("/") + 1)

    if (fs.existsSync(diagramPath)) {
      const content = await vscode.workspace.fs.readFile(
        vscode.Uri.file(diagramPath)
      )
      const contentString = new TextDecoder("utf-8").decode(content)
      let contentJson

      try {
        contentJson = JSON.parse(contentString)
      } catch (error) {
        vscode.window.showErrorMessage(
          "The diagram can not be loaded as it does not have a valid format"
        )
        return
      }

      provider.loadDiagram(
        diagramName,
        contentJson.model?.type,
        contentJson.model
      )
      provider.setLoadedDiagramPath(diagramPath)
    }
  } else {
    vscode.window.showErrorMessage("No active file!")
  }
}

/**
 * Associates .apollon file type with the JSON file type for syntax highlighting and file icon
 */
function associateApollonType() {
  const fileExtension = "*.apollon"
  const targetLanguage = "json"
  const filesConfig = vscode.workspace.getConfiguration("files")

  const currentAssociations: { [key: string]: string } =
    filesConfig.get("associations") || {}
  if (currentAssociations[fileExtension] !== targetLanguage) {
    filesConfig
      .update(
        "associations",
        {
          ...currentAssociations,
          [fileExtension]: targetLanguage,
        },
        vscode.ConfigurationTarget.Global
      )
      .then(
        () => {
          console.log(
            `Associated ${fileExtension} with ${targetLanguage} syntax.`
          )
        },
        (error) => {
          console.error("Error updating file associations:", error)
          vscode.window.showErrorMessage(
            `Failed to associate ${fileExtension} with ${targetLanguage} syntax.`
          )
        }
      )
  }
}

export function deactivate() {}
