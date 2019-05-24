import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, compose, createStore, DeepPartial, Reducer } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { all, call, spawn } from 'redux-saga/effects';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { AssessmentReducer } from '../../services/assessment/assessment-reducer';
import { EditorReducer } from '../../services/editor/editor-reducer';
import { UMLContainerReducer } from '../../services/uml-container/uml-container-reducer';
import { UMLContainerSaga } from '../../services/uml-container/uml-container-saga';
import { UMLContainerActions } from '../../services/uml-container/uml-container-types';
import { UMLDiagramReducer } from '../../services/uml-diagram/uml-diagram-reducer';
import { UMLDiagramSaga } from '../../services/uml-diagram/uml-diagram-saga';
import { ConnectableReducer } from '../../services/uml-element/connectable/connectable-reducer';
// import { UMLDiagramSaga } from '../../services/uml-diagram/uml-diagram-saga';
import { HoverableReducer } from '../../services/uml-element/hoverable/hoverable-reducer';
import { InteractableReducer } from '../../services/uml-element/interactable/interactable-reducer';
import { MovableReducer } from '../../services/uml-element/movable/movable-reducer';
import { MovingReducer } from '../../services/uml-element/movable/moving-reducer';
import { MovingActions } from '../../services/uml-element/movable/moving-types';
import { ResizableReducer } from '../../services/uml-element/resizable/resizable-reducer';
import { ResizingReducer } from '../../services/uml-element/resizable/resizing-reducer';
import { ResizingActions } from '../../services/uml-element/resizable/resizing-types';
import { SelectableReducer } from '../../services/uml-element/selectable/selectable-reducer';
import { UMLElementReducer } from '../../services/uml-element/uml-element-reducer';
// import { UMLElementSaga } from '../../services/uml-element/uml-element-saga';
import { UMLElementActions, UMLElementState } from '../../services/uml-element/uml-element-types';
import { UpdatableReducer } from '../../services/uml-element/updatable/updatable-reducer';
import { UMLRelationshipReducer } from '../../services/uml-relationship/uml-relationship-reducer';
// import { UMLRelationshipSaga } from '../../services/uml-relationship/uml-relationship-saga';
import { UMLRelationshipActions } from '../../services/uml-relationship/uml-relationship-types';
import { undoable } from '../../services/undo/undo-reducer';
import { Action } from '../../utils/actions/actions';
import { UMLElementFeatures } from '../uml-element/uml-element-component';
import { ModelState } from './model-state';

const reduceReducers = <T extends Action>(
  ...reducers: Array<Reducer<UMLElementState, T>>
): Reducer<UMLElementState, T> => {
  return (state = {}, action) => {
    return reducers.reduce<UMLElementState>((newState, reducer) => {
      return reducer(newState, action);
    }, state);
  };
};

const reducers = {
  editor: EditorReducer,
  diagram: UMLDiagramReducer,
  hovered: HoverableReducer,
  selected: SelectableReducer,
  moving: MovableReducer,
  resizing: ResizableReducer,
  connecting: ConnectableReducer,
  interactive: InteractableReducer,
  updating: UpdatableReducer,
  elements: reduceReducers<
    UMLElementActions & ResizingActions & MovingActions & UMLRelationshipActions & UMLContainerActions
  >(UMLElementReducer, ResizingReducer, MovingReducer, UMLRelationshipReducer, UMLContainerReducer),
  assessments: AssessmentReducer,
  features: ((
    state = { hoverable: true, selectable: true, movable: true, resizable: true, connectable: true, updatable: true },
  ) => state) as Reducer<UMLElementFeatures>,
};

const getInitialState = ({ initialState }: Props) => {
  const reducer = undoable(combineReducers<ModelState>(reducers));
  const sagaMiddleware = createSagaMiddleware();
  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancer = composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<ModelState, Action>, sagaMiddleware));

  function* rootSaga() {
    const sagas = [UMLContainerSaga, UMLDiagramSaga];

    yield all(
      sagas.map(saga =>
        spawn(function*() {
          while (true) {
            try {
              yield call(saga);
              break;
            } catch (e) {
              console.log('error', e);
            }
          }
        }),
      ),
    );
    // yield all([UMLElementSaga, UMLRelationshipSaga, UMLContainerSaga, UMLDiagramSaga].map(fork));
    // yield all([UMLContainerSaga].map(spawn));
  }
  const store = createStore(reducer, initialState || {}, enhancer);

  sagaMiddleware.run(rootSaga);
  return { store };
};

type State = ReturnType<typeof getInitialState>;

export class ModelStore extends React.Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    return <Provider store={this.state.store}>{this.props.children}</Provider>;
  }
}

export interface Props {
  initialState?: DeepPartial<ModelState>;
}
