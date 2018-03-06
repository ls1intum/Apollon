import { ReduxAction, ReduxState } from "../";
import { UUID } from "../../uuid";

type State = ReduxState["interactiveElements"];

const initialState: State = {
    allIds: []
};

export default function interactiveElementsReducer(
    state = initialState,
    action: ReduxAction
): State {
    switch (action.type) {
        case "TOGGLE_INTERACTIVE_ELEMENTS": {
            const allIds = new Set(state.allIds);
            for (const id of action.elementIds) {
                allIds.has(id) ? allIds.delete(id) : allIds.add(id);
            }
            return {
                ...state,
                allIds: Array.from(allIds)
            };
        }

        case "DELETE_ENTITIES":
            return removeIdsFromAllIds(state, ...action.entityIds);

        case "DELETE_RELATIONSHIPS":
            return removeIdsFromAllIds(state, ...action.relationshipIds);

        case "DELETE_ENTITY_MEMBER":
            return removeIdsFromAllIds(state, action.memberId);

        default:
            return state;
    }
}

function removeIdsFromAllIds(state: State, ...idsToRemove: UUID[]): State {
    return {
        ...state,
        allIds: state.allIds.filter(id => !idsToRemove.includes(id))
    };
}
