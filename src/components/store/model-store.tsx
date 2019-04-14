import React from 'react';
import { Provider } from 'react-redux';
import {
  Action,
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  DeepPartial,
  Reducer,
  Store as ReduxStore,
} from 'redux';
import createSagaMiddleware from 'redux-saga';
import { all, fork } from 'redux-saga/effects';
import { AssessmentReducer } from '../../services/assessment/assessment-reducer';
import { ContainerReducer } from '../../services/container/container-reducer';
import { ContainerSaga } from '../../services/container/container-saga';
import { ContainerActions } from '../../services/container/container-types';
import { DiagramReducer } from '../../services/diagram/diagram-reducer';
import { DiagramSaga } from '../../services/diagram/diagram-saga';
import { EditorReducer } from '../../services/editor/editor-reducer';
import { ElementReducer } from '../../services/element/element-reducer';
import { ElementSaga } from '../../services/element/element-saga';
import { ElementActions, ElementState } from '../../services/element/element-types';
import { RelationshipReducer } from '../../services/relationship/relationship-reducer';
import { RelationshipSaga } from '../../services/relationship/relationship-saga';
import { RelationshipActions } from '../../services/relationship/relationship-types';
import { undoable } from '../../services/undo/undo-reducer';
import { ModelState } from './model-state';

export class ModelStore extends React.Component<Props> {
  store: ReduxStore<ModelState>;

  private reducers = {
    editor: EditorReducer,
    diagram: DiagramReducer,
    elements: this.reduceReducers<ElementActions & RelationshipActions & ContainerActions>(
      ElementReducer,
      RelationshipReducer,
      ContainerReducer,
    ),
    assessments: AssessmentReducer,
  };

  constructor(props: Readonly<Props>) {
    super(props);

    const reducer = undoable(combineReducers<ModelState>(this.reducers));

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

  private reduceReducers<T extends Action>(...reducers: Array<Reducer<ElementState, T>>): Reducer<ElementState, T> {
    return (state = {}, action) => {
      return reducers.reduce<ElementState>((newState, reducer) => {
        return reducer(newState, action);
      }, state);
    };
  }
}

export interface Props {
  initialState?: DeepPartial<ModelState>;
}
