import * as vscode from "vscode"
import type { UMLDiagramType } from "@tumaet/apollon"
import { ApollonEditorProvider } from "./apollonEditorProvider"
import { diagramTitle, scaffoldDocument } from "./diagramDocument"
import { diagramTypeEntries } from "./shared/diagramTypes"
import type { ExportFormat } from "./shared/protocol"

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

  const contents = scaffoldDocument(picked.type, diagramTitle(target.path))
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
  const formats: (vscode.QuickPickItem & { format: ExportFormat })[] = [
    { label: "SVG", description: "Vector, scales without loss", format: "svg" },
    { label: "PNG", description: "Bitmap, pastes anywhere", format: "png" },
  ]
  const picked = await vscode.window.showQuickPick(formats, {
    title: "Export diagram",
    placeHolder: "Choose an image format",
  })
  if (!picked) {
    return
  }
  await provider.exportActiveDiagram(picked.format)
}
