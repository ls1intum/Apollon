import * as vscode from "vscode"
import * as fs from "fs"
import { createDefaultDiagram, UMLDiagramType, UMLModel } from "./types"
import path from "path"

type EditorMessage = {
  type: "editorMounted" | "saveDiagram" | "exportDiagram"
  exportContent: string
  exportType: "png" | "svg"
  model: UMLModel
}

export default class MenuProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView
  private editorPanel?: vscode.WebviewPanel
  private loadedDiagramPath?: string
  private modelToLoad?: UMLModel
  private currentDiagramType?: UMLDiagramType
  private currentDiagramName?: string

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForMenu(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "fetchDiagrams": {
          const rootUri = vscode.workspace.workspaceFolders?.[0].uri

          if (!rootUri) {
            return
          }

          const diagrams = await this.fetchDiagrams(rootUri)

          await webviewView.webview.postMessage({
            command: "updateDiagrams",
            diagrams: diagrams,
          })

          break
        }
        case "createDiagram": {
          const rootUri = vscode.workspace.workspaceFolders?.[0].uri

          if (!rootUri) {
            vscode.window.showErrorMessage("No workspace folder open")
            return
          }

          const name = `${data.name}.apollon`
          const diagram = JSON.stringify(createDefaultDiagram(data.diagramType))
          const filePath = path.join(rootUri.fsPath, name)

          try {
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(filePath),
              Buffer.from(diagram, "utf8")
            )
            vscode.window.showInformationMessage(
              `Successfuly created diagram ${name}`
            )
          } catch (error) {
            vscode.window.showErrorMessage(`Error creating diagram: ${error}`)
          }

          const diagrams = await this.fetchDiagrams(rootUri)
          await webviewView.webview.postMessage({
            command: "updateDiagrams",
            diagrams: diagrams,
          })
          this.loadDiagram(name, data.diagramType)
          this.loadedDiagramPath = filePath

          break
        }
        case "loadDiagram": {
          const rootUri = vscode.workspace.workspaceFolders?.[0].uri

          if (!rootUri) {
            vscode.window.showErrorMessage("No workspace folder open")
            return
          }

          const relativeDiagramPath: string = data.path
          const fullDiagramPath = path.join(rootUri.fsPath, relativeDiagramPath)
          const diagramName = relativeDiagramPath.substring(
            relativeDiagramPath.lastIndexOf("/") + 1
          )

          try {
            if (fs.existsSync(fullDiagramPath)) {
              const content = await vscode.workspace.fs.readFile(
                vscode.Uri.file(fullDiagramPath)
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

              this.loadDiagram(
                diagramName,
                contentJson.model?.type,
                contentJson.model
              )
              this.loadedDiagramPath = fullDiagramPath
            } else {
              vscode.window.showErrorMessage("Diagram file not found")
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `An unexpected error occured: "${error}"`
            )
          }

          break
        }
      }
    })
  }

  loadDiagram(name: string, diagramType?: UMLDiagramType, model?: UMLModel) {
    const editorIconPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "apollon-type.svg"
    )

    // Store current diagram info for the message handler
    this.currentDiagramName = name
    this.currentDiagramType = diagramType

    if (this.editorPanel) {
      this.editorPanel.webview.postMessage({
        command: "loadDiagram",
        diagramType: diagramType,
        model: model ? JSON.stringify(model) : undefined,
      })
      this.editorPanel.title = `${name} (Editor view)`
      this.editorPanel.reveal(vscode.ViewColumn.One)
    } else {
      this.editorPanel = vscode.window.createWebviewPanel(
        "editor",
        `${name} (Editor view)`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this._extensionUri],
        }
      )
      this.editorPanel.iconPath = editorIconPath
      this.modelToLoad = model
      this.editorPanel.webview.onDidReceiveMessage(
        async (data) => await this.listenToEditorMessages(data)
      )
      this.editorPanel.webview.html = this._getHtmlForEditor(
        this.editorPanel.webview
      )
      this.editorPanel.onDidDispose(() => {
        this.editorPanel = undefined
        this.loadedDiagramPath = undefined
        this.currentDiagramName = undefined
        this.currentDiagramType = undefined
      })
    }
  }

  setLoadedDiagramPath(loadedDiagramPath: string) {
    this.loadedDiagramPath = loadedDiagramPath
  }

  private async listenToEditorMessages(data: EditorMessage) {
    switch (data.type) {
      case "editorMounted": {
        if (this.editorPanel) {
          this.editorPanel.webview.postMessage({
            command: "loadDiagram",
            diagramType: this.currentDiagramType,
            model: this.modelToLoad
              ? JSON.stringify(this.modelToLoad)
              : undefined,
          })
          this.modelToLoad = undefined
        }

        break
      }
      case "saveDiagram": {
        const rootUri = vscode.workspace.workspaceFolders?.[0].uri

        if (!rootUri) {
          vscode.window.showErrorMessage("No workspace folder open")
          return
        }

        if (!this.loadedDiagramPath) {
          vscode.window.showErrorMessage("An unexpected error occured")
          return
        }

        try {
          if (fs.existsSync(this.loadedDiagramPath)) {
            const content = await vscode.workspace.fs.readFile(
              vscode.Uri.file(this.loadedDiagramPath)
            )
            const contentString = new TextDecoder("utf-8").decode(content)
            const contentJson = JSON.parse(contentString)
            contentJson.model = data.model

            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(this.loadedDiagramPath),
              Buffer.from(JSON.stringify(contentJson), "utf8")
            )
          } else {
            vscode.window.showErrorMessage("Diagram file not found")
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `An unexpected error occured: "${error}"`
          )
        }

        break
      }
      case "exportDiagram": {
        const { exportContent, exportType } = data

        if (!this.loadedDiagramPath) {
          vscode.window.showErrorMessage("An unexpected error occured")
          return
        }

        const exportPath = vscode.Uri.file(
          this.loadedDiagramPath.substring(
            0,
            this.loadedDiagramPath.lastIndexOf(".") + 1
          ) + exportType
        )
        const exportContentBuffer = Buffer.from(exportContent, "utf8")

        try {
          await vscode.workspace.fs.writeFile(exportPath, exportContentBuffer!)
          vscode.window.showInformationMessage(
            `Successfuly exported diagram ${this.currentDiagramName}`
          )
        } catch (error) {
          vscode.window.showErrorMessage(
            `An unexpected error occured: "${error}"`
          )
        }

        break
      }
    }
  }

  private async fetchDiagrams(rootUri: vscode.Uri) {
    const includePattern = new vscode.RelativePattern(
      rootUri.fsPath,
      "**/*.apollon"
    )
    const excludePattern = new vscode.RelativePattern(
      rootUri.fsPath,
      "{.git,.vscode,**/node_modules}/**"
    )
    const diagrams = await vscode.workspace.findFiles(
      includePattern.pattern,
      excludePattern.pattern
    )

    return diagrams.map((file) => `.${file.fsPath.split(rootUri.path)[1]}`)
  }

  private _getHtmlForMenu(webview: vscode.Webview) {
    const scriptSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "menu", "dist", "index.js")
    )
    const cssSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "menu", "dist", "index.css")
    )

    return `<!DOCTYPE html>
          <html lang="en">
            <head>
              <link rel="stylesheet" href="${cssSrc}" />
            </head>
            <body>
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <div id="menu-root"></div>
              <script src="${scriptSrc}"></script>
            </body>
          </html>
          `
  }

  private _getHtmlForEditor(webview: vscode.Webview) {
    const scriptSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "editor", "dist", "index.js")
    )
    const cssSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "editor", "dist", "index.css")
    )

    return `<!DOCTYPE html>
          <html lang="en">
            <head>
              <link rel="stylesheet" href="${cssSrc}" />
            </head>
            <body>
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <div id="editor-root"></div>
              <script src="${scriptSrc}"></script>
            </body>
          </html>
          `
  }
}
