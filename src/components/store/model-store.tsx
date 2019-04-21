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
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { AssessmentReducer } from '../../services/assessment/assessment-reducer';
import { EditorReducer } from '../../services/editor/editor-reducer';
import { UMLContainerReducer } from '../../services/uml-container/uml-container-reducer';
// import { UMLContainerSaga } from '../../services/uml-container/uml-container-saga';
import { UMLContainerActions } from '../../services/uml-container/uml-container-types';
import { UMLDiagramReducer } from '../../services/uml-diagram/uml-diagram-reducer';
// import { UMLDiagramSaga } from '../../services/uml-diagram/uml-diagram-saga';
import { HoverableReducer } from '../../services/uml-element/hoverable/hoverable-reducer';
import { InteractableReducer } from '../../services/uml-element/interactable/interactable-reducer';
import { MovableReducer } from '../../services/uml-element/movable/movable-reducer';
import { MovableActions } from '../../services/uml-element/movable/movable-types';
import { ResizableReducer } from '../../services/uml-element/resizable/resizable-reducer';
import { ResizableActions } from '../../services/uml-element/resizable/resizable-types';
import { SelectableReducer } from '../../services/uml-element/selectable/selectable-reducer';
import { UMLElementReducer } from '../../services/uml-element/uml-element-reducer';
// import { UMLElementSaga } from '../../services/uml-element/uml-element-saga';
import { UMLElementActions, UMLElementState } from '../../services/uml-element/uml-element-types';
import { UpdatableReducer } from '../../services/uml-element/updatable/updatable-reducer';
import { UMLRelationshipReducer } from '../../services/uml-relationship/uml-relationship-reducer';
// import { UMLRelationshipSaga } from '../../services/uml-relationship/uml-relationship-saga';
import { UMLRelationshipActions } from '../../services/uml-relationship/uml-relationship-types';
import { undoable } from '../../services/undo/undo-reducer';
import { ModelState } from './model-state';

export class ModelStore extends React.Component<Props> {
  store: ReduxStore<ModelState>;

  private reducers = {
    editor: EditorReducer,
    diagram: UMLDiagramReducer,
    hovered: HoverableReducer,
    selected: SelectableReducer,
    interactive: InteractableReducer,
    updating: UpdatableReducer,
    elements: this.reduceReducers<
      UMLElementActions & ResizableActions & MovableActions & UMLRelationshipActions & UMLContainerActions
    >(UMLElementReducer, ResizableReducer, MovableReducer, UMLRelationshipReducer, UMLContainerReducer),
    assessments: AssessmentReducer,
  };

  constructor(props: Readonly<Props>) {
    super(props);

    const reducer = undoable(combineReducers<ModelState>(this.reducers));

    const sagaMiddleware = createSagaMiddleware();

    const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    const enhancer = composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<ModelState>, sagaMiddleware));
    this.store = createStore(reducer, props.initialState || {}, enhancer);

    function* rootSaga() {
      // yield all([UMLElementSaga, UMLRelationshipSaga, UMLContainerSaga, UMLDiagramSaga].map(fork));
      yield null;
    }

    sagaMiddleware.run(rootSaga);
  }

  render() {
    return <Provider store={this.store}>{this.props.children}</Provider>;
  }

  private reduceReducers<T extends Action>(
    ...reducers: Array<Reducer<UMLElementState, T>>
  ): Reducer<UMLElementState, T> {
    return (state = {}, action) => {
      return reducers.reduce<UMLElementState>((newState, reducer) => {
        return reducer(newState, action);
      }, state);
    };
  }
}

export interface Props {
  initialState?: DeepPartial<ModelState>;
}
