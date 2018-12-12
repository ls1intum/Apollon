import { ReduxAction } from "../actions";
import { State as ReduxState } from './../../../components/Store';

export const MIN_CANVAS_WIDTH = 3000;
export const MIN_CANVAS_HEIGHT = 3000;

type State = ReduxState["editor"];

const initialState: State = {
    gridSize: 10,
    canvasSize: {
        width: MIN_CANVAS_WIDTH,
        height: MIN_CANVAS_HEIGHT
    }
};

export default function editorReducer(state = initialState, action: ReduxAction): State {
    switch (action.type) {
        case "RESIZE_CANVAS":
            return {
                ...state,
                canvasSize: action.newSize
            };

        default:
            return state;
    }
}
