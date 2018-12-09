import { UUID } from '../utils/uuid';

export interface ElementSelection {
    entityIds: UUID[];
    relationshipIds: UUID[];
}

export const enum DiagramType {
    ClassDiagram = "CLASS",
    ActivityDiagram = "ACTIVITY"
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
