import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers, Store as ReduxStore } from 'redux';
import createSagaMiddleware from "redux-saga";
import ReduxState from './State';
import mainSaga from "./../../gui/redux/sagas";
import { UUID } from "../../core/utils";

import editorReducer from "./../../gui/redux/editor/reducer";
import entitiesReducer from "./../../gui/redux/entities/reducer";
import interactiveElementsReducer from "./../../gui/redux/interactiveElements/reducer";
import relationshipsReducer from "./../../gui/redux/relationships/reducer";
import { ElementReducer, Actions } from './../../domain/Element';

class Store extends React.Component<Props> {
  public store: ReduxStore<ReduxState>;

  private reducers = {
    entities: entitiesReducer,
    relationships: relationshipsReducer,
    interactiveElements: interactiveElementsReducer,
    editor: editorReducer,
    elements: ElementReducer,
  }

  constructor(props: Readonly<Props>) {
    super(props);

    const sagaMiddleware = createSagaMiddleware();
    const reducer = combineReducers(this.reducers);

    const composeEnhancers: typeof compose =
        (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    this.store = createStore(reducer, props.initialState || {}, enhancer);
    // sagaMiddleware.run(mainSaga, this.props.selectEntities);
  }

  render() {
    return <Provider store={this.store}>{this.props.children}</Provider>;
  }
}

export interface Props {
  initialState?: ReduxState;
  // selectEntities: (entityIds: UUID[]) => void;
}

export default Store;
