import React from 'react';
import { Provider } from 'react-redux';
import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
  Store as ReduxStore,
  Reducer,
  AnyAction,
} from 'redux';
import createSagaMiddleware from 'redux-saga';
import ReduxState from './State';
import reduceReducers from 'reduce-reducers';

import EditorService from './../../services/EditorService';
import interactiveElementsReducer from './../../services/redux/interactiveElements/reducer';
import { ElementReducer } from './../../domain/Element';
import { ContainerReducer } from './../../domain/Container';
import { DiagramReducer } from './../../domain/Diagram';
import { withUndoRedo } from './../../services/redux/undoRedo';

import { all, fork } from 'redux-saga/effects';
import { ElementSaga } from './../../domain/Element';
import { RelationshipReducer, RelationshipSaga } from './../../domain/Relationship';
import { saga as saga2 } from './../../domain/Container';
import { saga as saga3 } from './../../domain/Diagram';

class Store extends React.Component<Props> {
  public store: ReduxStore<ReduxState>;

  private reducers = {
    interactiveElements: interactiveElementsReducer,
    editor: EditorService.reducer,
    diagram: DiagramReducer,
    // relationships: RelationshipReducer,
    elements: reduceReducers(ElementReducer as any, RelationshipReducer as any, ContainerReducer) as any,
  };

  constructor(props: Readonly<Props>) {
    super(props);

    const reducer = withUndoRedo(
      combineReducers<ReduxState>(this.reducers)
    ) as Reducer<ReduxState>;

    const sagaMiddleware = createSagaMiddleware();

    const composeEnhancers: typeof compose =
      (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    this.store = createStore(reducer, props.initialState || {}, enhancer);

    function* rootSaga() {
      yield all([ElementSaga, RelationshipSaga, saga2, saga3].map(fork));
    }

    sagaMiddleware.run(rootSaga);
  }

  render() {
    return <Provider store={this.store}>{this.props.children}</Provider>;
  }
}

export interface Props {
  initialState: ReduxState | null;
}

export default Store;
