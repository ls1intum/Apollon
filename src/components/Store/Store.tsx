import React from 'react';
import { Provider } from 'react-redux';
import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
  Store as ReduxStore,
} from 'redux';
import createSagaMiddleware from 'redux-saga';
import ReduxState from './State';
import reduceReducers from 'reduce-reducers';

import EditorService from './../../services/EditorService';

import { all, fork } from 'redux-saga/effects';
import { ElementReducer, ElementSaga } from './../../domain/Element';
import { RelationshipReducer, RelationshipSaga } from './../../domain/Relationship';
import { ContainerReducer, ContainerSaga } from './../../domain/Container';
import { DiagramReducer, DiagramSaga } from './../../domain/Diagram';
import { reducer as AssessmentReducer } from './../../services/assessments';

class Store extends React.Component<Props> {
  public store: ReduxStore<ReduxState>;

  private reducers = {
    editor: EditorService.reducer,
    diagram: DiagramReducer,
    elements: reduceReducers(ElementReducer as any, RelationshipReducer as any, ContainerReducer as any) as any,
    assessments: AssessmentReducer,
  };

  constructor(props: Readonly<Props>) {
    super(props);

    const reducer = combineReducers<ReduxState>(this.reducers as any);

    const sagaMiddleware = createSagaMiddleware();

    const composeEnhancers: typeof compose =
      (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    this.store = createStore(reducer, props.initialState || {}, enhancer);

    function* rootSaga() {
      yield all([ElementSaga, RelationshipSaga, ContainerSaga, DiagramSaga].map(fork));
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
