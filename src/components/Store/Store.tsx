import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers, Store as ReduxStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { ModelState } from './model-state';
import reduceReducers from 'reduce-reducers';

import { all, fork } from 'redux-saga/effects';
import { RelationshipReducer, RelationshipSaga } from './../../domain/Relationship';
import { AssessmentReducer } from '../../services/assessment/assessment-reducer';
import { ContainerReducer } from '../../services/container/container-reducer';
import { DiagramReducer } from '../../services/diagram/diagram-reducer';
import { EditorReducer } from './../../services/editor/editor-reducer';
import { ElementReducer } from '../../services/element/element-reducer';
import { ContainerSaga } from '../../services/container/container-saga';
import { DiagramSaga } from '../../services/diagram/diagram-saga';
import { ElementSaga } from '../../services/element/element-saga';

class Store extends React.Component<Props> {
  public store: ReduxStore<ModelState>;

  private reducers = {
    editor: EditorReducer,
    diagram: DiagramReducer,
    elements: reduceReducers(ElementReducer as any, RelationshipReducer as any, ContainerReducer as any) as any,
    assessments: AssessmentReducer,
  };

  constructor(props: Readonly<Props>) {
    super(props);

    const reducer = combineReducers<ModelState>(this.reducers as any);

    const sagaMiddleware = createSagaMiddleware();

    const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

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
  initialState: ModelState | null;
}

export default Store;
