import * as vscode from "vscode"
import { ApollonEditorProvider } from "./apollonEditorProvider"

const DIAGRAM_GLOB = "**/*.apollon"

/**
 * The workspace's diagrams in the activity bar. A native tree rather than a
 * webview: it inherits the file icons, theming and context menus for free, and
 * it stays in sync through a filesystem watcher.
 */
export class DiagramTreeProvider
  implements vscode.TreeDataProvider<vscode.Uri>, vscode.Disposable
{
  private readonly changed = new vscode.EventEmitter<void>()
  public readonly onDidChangeTreeData = this.changed.event
  private readonly watcher: vscode.FileSystemWatcher

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher(DIAGRAM_GLOB)
    this.watcher.onDidCreate(() => this.refresh())
    this.watcher.onDidDelete(() => this.refresh())
  }

  public refresh(): void {
    this.changed.fire()
  }

  public dispose(): void {
    this.watcher.dispose()
    this.changed.dispose()
  }

  public getTreeItem(uri: vscode.Uri): vscode.TreeItem {
    // A resourceUri item already labels itself with the basename and picks up the
    // language's file icon, so the description is only useful for the containing
    // folder — and only when there is one to name.
    const item = new vscode.TreeItem(uri, vscode.TreeItemCollapsibleState.None)
    const folder = vscode.workspace.asRelativePath(uri).split("/").slice(0, -1)
    item.description = folder.join("/") || undefined
    // `vscode.open` picks whatever editor is registered as the default, which the
    // user (or a stale `files.associations`) can point elsewhere. This view is
    // specifically the diagram list, so name the editor.
    item.command = {
      command: "vscode.openWith",
      title: "Open Diagram",
      arguments: [uri, ApollonEditorProvider.viewType],
    }
    return item
  }

  public async getChildren(element?: vscode.Uri): Promise<vscode.Uri[]> {
    if (element) {
      return []
    }
    const found = await vscode.workspace.findFiles(
      DIAGRAM_GLOB,
      "**/node_modules/**"
    )
    return found.sort((a, b) => a.path.localeCompare(b.path))
  }
}
