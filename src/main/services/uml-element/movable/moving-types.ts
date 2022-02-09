import { Action } from '../../../utils/actions/actions.js';
import { UMLElementState } from '../uml-element-types.js';

export const enum MovingActionTypes {
  MOVE = '@@element/movable/MOVE',
}

export type MovingState = UMLElementState;

export type MovingActions = MoveAction;

export type MoveAction = Action<MovingActionTypes.MOVE> & {
  payload: {
    ids: string[];
    delta: {
      x: number;
      y: number;
    };
  };
};
