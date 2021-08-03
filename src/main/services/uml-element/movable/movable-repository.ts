import { UMLElementType } from '../../../packages/uml-element-type';
import { UMLElements } from '../../../packages/uml-elements';
import { UMLRelationships } from '../../../packages/uml-relationships';
import { AsyncAction } from '../../../utils/actions/actions';
import { filterRoots } from '../../../utils/geometry/tree';
import { UMLRelationshipFeatures } from '../../uml-relationship/uml-relationship-features';
import { UMLElementFeatures } from '../uml-element-features';
import { MovableActionTypes, MoveEndAction, MoveStartAction } from './movable-types';
import { MoveAction, MovingActionTypes } from './moving-types';
import { UMLDiagramRepository } from '../../uml-diagram/uml-diagram-repository';

// when moving an element, it is copied from the elements of the redux state and handled in the moving state separately
// we do this, because it enables us to not do a full shallow copy of all elements in the state, when a pointer move event is triggered
// but just update the position of elements which are actually moved
// that is why there is the the separation of movable and moving reducer
export const Movable = {
  startMoving:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const { elements, selected } = getState();
      const ids = id ? (Array.isArray(id) ? id : [id]) : filterRoots(selected, elements);

      const movables = [];
      const constructors = { ...UMLElements, ...UMLRelationships };
      for (const i of ids) {
        const feature = constructors[elements[i].type as UMLElementType].features as UMLElementFeatures &
          UMLRelationshipFeatures;
        if (feature.movable) {
          movables.push(i);
        }
      }

      if (!movables.length) {
        return;
      }

      dispatch(UMLDiagramRepository.bringToFront(ids));
      dispatch<MoveStartAction>({
        type: MovableActionTypes.START,
        payload: { ids: movables },
        undoable: true,
      });
    },

  move:
    (delta: { x: number; y: number }, id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
      if (!ids.length) {
        return;
      }

      dispatch<MoveAction>({
        type: MovingActionTypes.MOVE,
        payload: { ids, delta },
        undoable: false,
      });
    },

  endMoving:
    (id?: string | string[], keyboard = false): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().moving;
      if (!ids.length) {
        return;
      }

      dispatch<MoveEndAction>({
        type: MovableActionTypes.END,
        payload: { ids, keyboard },
        undoable: false,
      });
    },
};
