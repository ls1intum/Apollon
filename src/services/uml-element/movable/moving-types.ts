import { Action } from '../../../utils/actions/actions';
import { UMLElementState } from '../uml-element-types';

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
