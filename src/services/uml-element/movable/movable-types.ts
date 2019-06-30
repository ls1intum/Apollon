import { Action } from '../../../utils/actions/actions';

export const enum MovableActionTypes {
  START = '@@element/movable/START',
  END = '@@element/movable/END',
}

export type MovableState = string[];

export type MovableActions = MoveStartAction | MoveEndAction;

export type MoveStartAction = Action<MovableActionTypes.START> & {
  payload: {
    ids: string[];
  };
};

export type MoveEndAction = Action<MovableActionTypes.END> & {
  payload: {
    ids: string[];
    keyboard: boolean;
  };
};
