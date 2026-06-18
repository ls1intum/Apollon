/* Shared foundation for the webapp component stories.
 *
 * Most webapp components read one or more of: React Router (global withRouter in
 * preview.tsx covers it), the EditorContext (live ApollonEditor + diagram name),
 * the ModalContext (openModal/closeModal), and — for modal *bodies* rendered
 * standalone — the ModalProgressContext. The `use*Context` hooks throw without
 * their provider, so any consumer needs the matching decorator.
 *
 * State (theme / persisted diagrams / versions) is held in zustand singletons;
 * seed them in a story's `beforeEach` and reset in the meta's `beforeEach`.
 */
import type { Decorator } from "@storybook/react-vite"
import { EditorProvider } from "@/contexts/EditorContext"
import { ModalProvider } from "@/contexts/ModalContext"
import { ModalProgressProvider } from "@/contexts/ModalProgressContext"

/**
 * Editor + Modal context providers — the common decorator for navbar, home, and
 * any component that can open a modal. (ModalProvider also mounts the modal
 * host, so `openModal` works inside a story.) Router is already global.
 */
export const WebappProviders: Decorator = (Story) => (
  <EditorProvider>
    <ModalProvider>
      <Story />
    </ModalProvider>
  </EditorProvider>
)

/**
 * For stories that render a modal *body* directly (not via openModal). Adds the
 * ModalProgressContext those bodies consume on top of the editor/modal context.
 */
export const ModalBodyProviders: Decorator = (Story) => (
  <EditorProvider>
    <ModalProvider>
      <ModalProgressProvider>
        <Story />
      </ModalProgressProvider>
    </ModalProvider>
  </EditorProvider>
)
