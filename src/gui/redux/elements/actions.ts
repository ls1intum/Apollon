import { UUID } from "../../../core/utils";

export type ElementsAction = DeleteElementsAction;

export interface DeleteElementsAction {
    type: "DELETE_ELEMENTS";
    entityIds: UUID[];
    relationshipIds: UUID[];
}

export function deleteElements(entityIds: UUID[], relationshipIds: UUID[]): DeleteElementsAction {
    return {
        type: "DELETE_ELEMENTS",
        entityIds,
        relationshipIds
    };
}
