import { useState, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Apollon } from "@tumaet/apollon"
import type { ApollonEditor, UMLModel } from "@tumaet/apollon"
import { EditorContext } from "@/contexts/EditorContext"
import { ModalProvider } from "@/contexts/ModalContext"
import { EditorChromeHeader } from "./EditorChromeHeader"

/**
 * The real editor chrome header. It `createPortal`s `EditorHeaderRow` into the
 * library's full-width `header` overlay band — but only once it has a live
 * `ApollonEditor` to acquire that region host from (`useRegionHost`). With no
 * editor in context it renders `null`, so these stories mount a real read-only
 * `Apollon` editor and wire its instance into `EditorContext`, exactly as the
 * `/local/:id` and `/shared/:id` pages do via `setEditor`.
 *
 * Because that mounts the editor's second React copy, the stories are visual
 * only — tagged `!test` so the interaction runner never loads it. The router is
 * already global (preview.tsx); `ModalProvider` lets Share/File open a modal.
 */

const SAMPLE_MODEL: UMLModel = {
  version: "4.0.0",
  type: "ClassDiagram",
  title: "Order Processing",
  nodes: [
    {
      id: "node-order",
      type: "ClassDiagram",
      position: { x: 160, y: 120 },
      width: 200,
      height: 110,
      data: {},
    },
  ],
  edges: [],
} as unknown as UMLModel

/**
 * Mounts a live read-only editor (so the `header` region host exists) and feeds
 * its instance into `EditorContext`, then renders the child header against it.
 */
function LiveEditorHost({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  // EditorContext.Provider directly (NOT the stub helper): EditorChromeHeader
  // calls editor.getRegionElement, which only a LIVE editor has. With a real
  // editor that is `undefined` until onMount, the header renders null until the
  // editor mounts — a stub-default would poison that first render.
  const [editor, setEditor] = useState<ApollonEditor | undefined>(undefined)
  const [diagramName, setDiagramName] = useState(title ?? SAMPLE_MODEL.title)
  return (
    <EditorContext.Provider
      value={{ editor, diagramName, setDiagramName, setEditor }}
    >
      <ModalProvider>
        <div style={{ position: "relative", height: "100vh", width: "100%" }}>
          <Apollon
            readonly
            defaultModel={{
              ...SAMPLE_MODEL,
              title: title ?? SAMPLE_MODEL.title,
            }}
            onMount={(instance) => setEditor(instance)}
            style={{ height: "100%", width: "100%" }}
          />
          {children}
        </div>
      </ModalProvider>
    </EditorContext.Provider>
  )
}

const meta = {
  title: "Webapp/Navbar/EditorChromeHeader",
  component: EditorChromeHeader,
  // Mounts a live ApollonEditor (second React copy) — keep visual only.
  tags: ["autodocs", "!test"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EditorChromeHeader>

export default meta
type Story = StoryObj<typeof meta>

/** The header portaled into a live editor's `header` band, full island bar. */
export const Default: Story = {
  render: () => (
    <LiveEditorHost>
      <EditorChromeHeader />
    </LiveEditorHost>
  ),
}

/** A long title — the centre track grows then ellipsises without overlap. */
export const LongTitle: Story = {
  render: () => (
    <LiveEditorHost title="A deliberately very long diagram title that has to ellipsise">
      <EditorChromeHeader />
    </LiveEditorHost>
  ),
}
