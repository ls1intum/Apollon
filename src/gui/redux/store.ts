import { ReduxState } from ".";
import { applyMiddleware, compose, createStore as reduxCreateStore, Store } from "redux";
import { createRootReducer } from "./reducers";
import { UUID } from "../../core/utils";

export function createStore(
    initialState: ReduxState | null,
    selectEntities: (entityIds: UUID[]) => void
): Store<ReduxState> {

    const composeEnhancers: typeof compose =
        (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers();
    const rootReducer = createRootReducer();

    const store =
        initialState === null
            ? reduxCreateStore(rootReducer, enhancer)
            : reduxCreateStore(rootReducer, initialState, enhancer);

    return store;
}
