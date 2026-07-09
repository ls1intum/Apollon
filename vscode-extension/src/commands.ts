import * as vscode from "vscode"
import type { UMLDiagramType } from "@tumaet/apollon"
import { ApollonEditorProvider } from "./apollonEditorProvider"
import { scaffold } from "./diagramDocument"
import { diagramTypeEntries } from "./diagramTypes"
import type { ExportFormat } from "./protocol"

type DiagramTypePick = vscode.QuickPickItem & { type: UMLDiagramType }

/**
 * Create a diagram: pick a type, pick a location, open it. The save dialog is
 * the platform's own, so the filename is legal by construction and this works in
 * multi-root, single-file and virtual workspaces alike.
 */
export async function newDiagram(): Promise<void> {
  const items: DiagramTypePick[] = diagramTypeEntries().map(
    ([type, label]) => ({
      label,
      type,
    })
  )
  const picked = await vscode.window.showQuickPick(items, {
    title: "New Apollon diagram",
    placeHolder: "Choose a diagram type",
  })
  if (!picked) {
    return
  }

  const folder = vscode.workspace.workspaceFolders?.[0]?.uri
  const target = await vscode.window.showSaveDialog({
    title: "Create diagram",
    filters: { "Apollon diagram": ["apollon"] },
    defaultUri: folder && vscode.Uri.joinPath(folder, "diagram.apollon"),
  })
  if (!target) {
    return
  }

  const title =
    target.path
      .split("/")
      .pop()
      ?.replace(/\.apollon$/i, "") ?? ""
  const contents = scaffold(picked.type, title)
  await vscode.workspace.fs.writeFile(target, Buffer.from(contents, "utf8"))
  await vscode.commands.executeCommand(
    "vscode.openWith",
    target,
    ApollonEditorProvider.viewType
  )
}

/** Export the focused diagram to a sibling image, asking for the format. */
export async function exportDiagram(
  provider: ApollonEditorProvider
): Promise<void> {
  const formats: ExportFormat[] = ["svg", "png"]
  const format = (await vscode.window.showQuickPick(formats, {
    title: "Export diagram",
    placeHolder: "Choose an image format",
  })) as ExportFormat | undefined
  if (!format) {
    return
  }
  await provider.exportActiveDiagram(format)
}
