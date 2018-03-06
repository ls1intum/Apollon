import * as Redux from "redux";
import { ReduxAction } from "./actions";
import editorReducer from "./editor/reducer";
import entitiesReducer from "./entities/reducer";
import interactiveElementsReducer from "./interactiveElements/reducer";
import relationshipsReducer from "./relationships/reducer";
import { ReduxState } from "./state";
import { withUndoRedo } from "./undoRedo";

export type Reducer<S> = (state: S, action: ReduxAction) => S;
type ReducerMapObject = { [TKey in keyof ReduxState]: Reducer<ReduxState[TKey] | undefined> };

export function createRootReducer() {
    const mapping: ReducerMapObject = {
        entities: entitiesReducer,
        relationships: relationshipsReducer,
        interactiveElements: interactiveElementsReducer,
        editor: editorReducer
    };

    const combinedReducer = Redux.combineReducers<ReduxState>(mapping as any);

    return withUndoRedo(combinedReducer) as Redux.Reducer<ReduxState>;
}
