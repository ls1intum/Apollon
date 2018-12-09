import { deleteElements, duplicateEntities, flipRelationships, moveEntities, ReduxAction, ReduxState } from "../redux";
import { ElementSelection } from "../../domain/Options/types";
import { UUID } from './../../domain/utils/uuid';

export function deleteSelectedElements(selection: ElementSelection): ReduxAction[] {
    const { entityIds, relationshipIds } = selection;
    return entityIds.length === 0 && relationshipIds.length === 0
        ? []
        : [deleteElements(entityIds, relationshipIds)];
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
