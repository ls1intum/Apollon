import { ReduxAction } from "../";
import { State as ReduxState } from './../../../components/Store';

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

        default:
            return state;
    }
}
