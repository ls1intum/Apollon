import { UUID } from "../core/utils";

export interface ElementSelection {
    entityIds: UUID[];
    relationshipIds: UUID[];
}

export const enum DiagramType {
    ClassDiagram = "CLASS_DIAGRAM",
    ActivityDiagram = "ACTIVITY_DIAGRAM"
}

export const enum ApollonMode {
    Full = "FULL",
    ModelingOnly = "MODELING_ONLY",
    ReadOnly = "READ_ONLY"
}

export const enum EditorMode {
    ModelingView = "MODELING_VIEW",
    InteractiveElementsView = "INTERACTIVE_AREAS_VIEW"
}

export const enum InteractiveElementsMode {
    Hidden = "HIDDEN",
    Highlighted = "HIGHLIGHTED"
}
