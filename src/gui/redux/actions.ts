import { EditorAction } from "./editor/actions";
import { EntitiesAction } from "./entities/actions";
import { InteractiveElementsAction } from "./interactiveElements/actions";
import { RelationshipsAction } from "./relationships/actions";
import { UndoRedoAction } from "./undoRedo/actions";
import { Delta } from "../../geometry";
import { Entity } from "../../uml";
import { newId } from "../../uuid";

export * from "./editor/actions";
export * from "./entities/actions";
export * from "./interactiveElements/actions";
export * from "./relationships/actions";
export * from "./undoRedo/actions";

export type ReduxAction =
    | EditorAction
    | EntitiesAction
    | InteractiveElementsAction
    | RelationshipsAction
    | SelectionAction
    | UndoRedoAction;

type SelectionAction = DuplicateSelectionAction;

export interface DuplicateSelectionAction {
    type: "DUPLICATE_SELECTION";
    newEntities: Entity[];
    offset: Delta;
}

export function duplicateSelection(entities: Entity[], offset: Delta): DuplicateSelectionAction {
    return {
        type: "DUPLICATE_SELECTION",
        newEntities: entities.map<Entity>(entity => ({
            ...entity,
            id: newId(),
            position: {
                x: entity.position.x + offset.dx,
                y: entity.position.y + offset.dy
            }
        })),
        offset
    };
}
