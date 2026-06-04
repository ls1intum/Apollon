export type ModalName =
  | "NEW_DIAGRAM"
  | "NEW_DIAGRAM_FROM_TEMPLATE"
  | "SHARE"
  | "SHARE_DASHBOARD"
  | "COLLABORATE_NAME"
  | "LOAD_DIAGRAM"
  | "EXPORT_PPTX"
  | "HowToUseModal"
  | "AboutModal"
  | "DELETE_VERSION"

export interface ModalProps {
  [key: string]: unknown
}

export enum DiagramView {
  EDIT = "EDIT",
  COLLABORATE = "COLLABORATE",
  GIVE_FEEDBACK = "GIVE_FEEDBACK",
  SEE_FEEDBACK = "SEE_FEEDBACK",
}
