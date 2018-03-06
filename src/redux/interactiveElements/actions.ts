import { UUID } from "../../uuid";

export type InteractiveElementsAction = ToggleInteractiveElementsAction;

interface ToggleInteractiveElementsAction {
    type: "TOGGLE_INTERACTIVE_ELEMENTS";
    elementIds: UUID[];
}

export function toggleInteractiveElements(...elementIds: UUID[]): ToggleInteractiveElementsAction {
    return {
        type: "TOGGLE_INTERACTIVE_ELEMENTS",
        elementIds
    };
}
