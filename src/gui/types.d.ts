import { UUID } from "../core/utils";

export interface ElementSelection {
    entityIds: UUID[];
    relationshipIds: UUID[];
}

export const enum EditorMode {
    ModelingView = "MODELING_VIEW",
    InteractiveElementsView = "INTERACTIVE_AREAS_VIEW"
}

export const enum InteractiveElementsMode {
    Hidden = "HIDDEN",
    Highlighted = "HIGHLIGHTED"
}
