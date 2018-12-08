import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers, Store as ReduxStore } from 'redux';
import createSagaMiddleware from "redux-saga";
import ReduxState from './State';
import { createRootReducer } from "./../../gui/redux/reducers";
import mainSaga from "./../../gui/redux/sagas";
import { UUID } from "../../core/utils";

class Store extends React.Component<Props> {
  public store: ReduxStore<ReduxState>;

  constructor(props: Readonly<Props>) {
    super(props);

    const sagaMiddleware = createSagaMiddleware();
    const reducer = createRootReducer();

    const composeEnhancers: typeof compose =
        (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    this.store = createStore(reducer, props.initialState || {}, enhancer);
    sagaMiddleware.run(mainSaga, this.props.selectEntities);
  }

  render() {
    return <Provider store={this.store}>{this.props.children}</Provider>;
  }
}

export interface Props {
  initialState?: ReduxState;
  selectEntities: (entityIds: UUID[]) => void;
}

export default Store;
