import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers, Store as ReduxStore } from 'redux';
import createSagaMiddleware from "redux-saga";
import ReduxState from './state';
import { createRootReducer } from "./../../gui/redux/reducers";
import mainSaga from "./../../gui/redux/sagas";
import { UUID } from "../../core/utils";
// import { ElementReducer, Actions } from './../../domain/Element';

class Store<P> extends React.Component<Props> {
  public store: ReduxStore<ReduxState>;

  constructor(props: Readonly<Props>) {
    super(props);

    const sagaMiddleware = createSagaMiddleware();
    const reducer = createRootReducer();

    const composeEnhancers: typeof compose =
        (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    // const enhancer =
    //   (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
    //   (window as any).__REDUX_DEVTOOLS_EXTENSION__();
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
