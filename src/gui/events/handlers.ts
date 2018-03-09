import {
    deleteEntities,
    deleteRelationships,
    duplicateEntities,
    flipRelationships,
    moveEntities,
    ReduxAction,
    ReduxState
} from "../redux";
import { ElementSelection } from "../../core/domain";
import { UUID } from "../../core/utils";

export function deleteSelectedElements(selection: ElementSelection): ReduxAction[] {
    const actions = [];

    if (selection.entityIds.length >= 1) {
        actions.push(deleteEntities(selection.entityIds));
    }

    if (selection.relationshipIds.length >= 1) {
        actions.push(deleteRelationships(selection.relationshipIds));
    }

    return actions;
}

export function moveSelectedEntities(entityIds: UUID[], dx: number, dy: number): ReduxAction[] {
    return entityIds.length === 0 ? [] : [moveEntities(entityIds, { dx, dy })];
}

export function duplicateSelectedEntities(
    selection: ElementSelection,
    state: ReduxState
): ReduxAction[] {
    const offset = {
        dx: state.editor.gridSize * 2,
        dy: state.editor.gridSize * 2
    };

    const entities = selection.entityIds.map(id => state.entities.byId[id]);

    return [duplicateEntities(entities, offset)];
}

export function flipSelectedRelationships(selection: ElementSelection): ReduxAction[] {
    const { entityIds, relationshipIds } = selection;
    return entityIds.length === 0 && relationshipIds.length >= 1
        ? [flipRelationships(relationshipIds)]
        : [];
}
