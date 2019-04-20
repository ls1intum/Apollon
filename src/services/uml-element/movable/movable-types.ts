import { Action } from '../../../utils/actions/actions';

export const enum MovableActionTypes {
  MOVE_START = '@@element/movable/MOVE_START',
  MOVE = '@@element/movable/MOVE',
  MOVE_END = '@@element/movable/MOVE_END',
}

export type MovableActions = MoveStartAction | MoveAction | MoveEndAction;

export interface MoveStartAction extends Action<MovableActionTypes.MOVE_START> {
  payload: {
    ids: string[];
  };
}

export interface MoveAction extends Action<MovableActionTypes.MOVE> {
  payload: {
    ids: string[];
    delta: {
      x: number;
      y: number;
    };
  };
}

export interface MoveEndAction extends Action<MovableActionTypes.MOVE_END> {
  payload: {
    ids: string[];
  };
}
