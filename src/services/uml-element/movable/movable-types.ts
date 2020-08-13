import { Action } from '../../../utils/actions/actions';
import { UMLElementState } from "../uml-element-types";
import { IUMLElement } from "../uml-element";

export const enum MovableActionTypes {
  START = '@@element/movable/START',
  MOVE = '@@element/movable/MOVE',
  END = '@@element/movable/END',
}

export type MovableState = UMLElementState;

export type MovableActions = MoveStartAction | MoveEndAction | MoveAction;

export type MoveStartAction = Action<MovableActionTypes.START> & {
  payload: {
    elements: IUMLElement[];
  };
};

export type MoveEndAction = Action<MovableActionTypes.END> & {
  payload: {
    ids: string[];
    keyboard: boolean;
  };
};

export type MoveAction = Action<MovableActionTypes.MOVE> & {
  payload: {
    ids: string[];
    delta: {
      x: number;
      y: number;
    };
  };
};
