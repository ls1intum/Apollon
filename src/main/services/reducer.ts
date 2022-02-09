import { Reducer, ReducersMapObject } from 'redux';
import { ModelState } from '../components/store/model-state.js';
import { Action } from '../utils/actions/actions.js';
import { Actions } from './actions.js';
import { AssessmentReducer } from './assessment/assessment-reducer.js';
import { EditorReducer } from './editor/editor-reducer.js';
import { UMLContainerReducer } from './uml-container/uml-container-reducer.js';
import { UMLDiagramReducer } from './uml-diagram/uml-diagram-reducer.js';
import { ConnectableReducer } from './uml-element/connectable/connectable-reducer.js';
import { HoverableReducer } from './uml-element/hoverable/hoverable-reducer.js';
import { InteractableReducer } from './uml-element/interactable/interactable-reducer.js';
import { MovableReducer } from './uml-element/movable/movable-reducer.js';
import { MovingReducer } from './uml-element/movable/moving-reducer.js';
import { ResizableReducer } from './uml-element/resizable/resizable-reducer.js';
import { ResizingReducer } from './uml-element/resizable/resizing-reducer.js';
import { SelectableReducer } from './uml-element/selectable/selectable-reducer.js';
import { UMLElementReducer } from './uml-element/uml-element-reducer.js';
import { UMLElementState } from './uml-element/uml-element-types.js';
import { UpdatableReducer } from './uml-element/updatable/updatable-reducer.js';
import { ReconnectableReducer } from './uml-relationship/reconnectable/reconnectable-reducer.js';
import { UMLRelationshipReducer } from './uml-relationship/uml-relationship-reducer.js';
import { CopyReducer } from './copypaste/copy-reducer.js';
import { LastActionReducer } from './last-action/last-action-reducer.js';

const reduce =
  <S, T extends Action>(intial: S, ...reducerList: Reducer<S, T>[]): Reducer<S, T> =>
  (state = intial, action) =>
    reducerList.reduce<S>((newState, reducer) => reducer(newState, action), state);

export const reducers: ReducersMapObject<ModelState, Actions> = {
  editor: EditorReducer,
  diagram: UMLDiagramReducer,
  hovered: HoverableReducer,
  selected: SelectableReducer,
  moving: MovableReducer,
  resizing: ResizableReducer,
  connecting: ConnectableReducer,
  reconnecting: ReconnectableReducer,
  interactive: InteractableReducer,
  updating: UpdatableReducer,
  copy: CopyReducer,
  lastAction: LastActionReducer,
  elements: reduce<UMLElementState, Actions>(
    {},
    UMLContainerReducer,
    UMLRelationshipReducer,
    UMLElementReducer,
    ResizingReducer,
    MovingReducer,
  ),
  assessments: AssessmentReducer,
};
