import React from 'react';
import { Provider } from 'react-redux';
import reduceReducers from 'reduce-reducers';
import { applyMiddleware, combineReducers, compose, createStore, Store as ReduxStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { all, fork } from 'redux-saga/effects';

import { AssessmentReducer } from '../../services/assessment/assessment-reducer';
import { ContainerReducer } from '../../services/container/container-reducer';
import { ContainerSaga } from '../../services/container/container-saga';
import { DiagramReducer } from '../../services/diagram/diagram-reducer';
import { DiagramSaga } from '../../services/diagram/diagram-saga';
import { EditorReducer } from '../../services/editor/editor-reducer';
import { ElementReducer } from '../../services/element/element-reducer';
import { ElementSaga } from '../../services/element/element-saga';
import { RelationshipReducer } from '../../services/relationship/relationship-reducer';
import { RelationshipSaga } from '../../services/relationship/relationship-saga';
import { ModelState } from './model-state';

export class ModelStore extends React.Component<Props> {
  store: ReduxStore<ModelState>;

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
