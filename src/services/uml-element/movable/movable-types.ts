import { Action } from '../../../utils/actions/actions';

export const enum MovableActionTypes {
  MOVE_START = '@@element/movable/MOVE_START',
  MOVE_END = '@@element/movable/MOVE_END',
}

export type MovableState = string[];

export type MovableActions = MoveStartAction | MoveEndAction;

export type MoveStartAction = Action<MovableActionTypes.MOVE_START> & {
  payload: {
    ids: string[];
  };
};

export type MoveEndAction = Action<MovableActionTypes.MOVE_END> & {
  payload: {
    ids: string[];
    keyboard: boolean;
  };
};
