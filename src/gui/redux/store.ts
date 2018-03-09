import { ReduxState } from ".";
import { applyMiddleware, compose, createStore as reduxCreateStore, Store } from "redux";
import createSagaMiddleware from "redux-saga";
import { createRootReducer } from "./reducers";
import mainSaga from "./sagas";
import { UUID } from "../../utils/uuid";

export function createStore(
    initialState: ReduxState | null,
    selectEntities: (entityIds: UUID[]) => void
): Store<ReduxState> {
    const sagaMiddleware = createSagaMiddleware();

    const composeEnhancers: typeof compose =
        (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    const rootReducer = createRootReducer();

    const store =
        initialState === null
            ? reduxCreateStore(rootReducer, enhancer)
            : reduxCreateStore(rootReducer, initialState, enhancer);

    sagaMiddleware.run(mainSaga, selectEntities);

    return store;
}
