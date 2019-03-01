import { Action } from 'redux';
import Element from '.';
import { DeepReadonly } from 'ts-essentials';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  HOVER = '@@element/HOVER',
  LEAVE = '@@element/LEAVE',
  SELECT = '@@element/SELECT',

  UPDATE = '@@element/UPDATE',
  RESIZE = '@@element/RESIZE',
  MOVE = '@@element/MOVE',
  DELETE = '@@element/DELETE',
}

export interface CreateAction extends Action<ActionTypes.CREATE> {
  payload: {
    element: Element;
  };
}

export interface HoverAction extends Action<ActionTypes.HOVER> {
  payload: {
    id: string;
    internal: boolean;
  };
}

export interface LeaveAction extends Action<ActionTypes.LEAVE> {
  payload: {
    id: string;
    internal: boolean;
  };
}

export interface SelectAction extends Action<ActionTypes.SELECT> {
  payload: {
    id: string | null;
    toggle: boolean;
  };
}

export interface UpdateAction extends Action<ActionTypes.UPDATE> {
  payload: {
    element: Element;
  };
}

export interface MoveAction extends Action<ActionTypes.MOVE> {
  payload: {
    id: string;
    position: {
      x: number;
      y: number;
    };
  };
}

export interface ResizeAction extends Action<ActionTypes.RESIZE> {
  payload: {
    id: string;
    size: {
      width: number;
      height: number;
    };
  };
}

export interface DeleteAction extends Action<ActionTypes.DELETE> {
  payload: {
    id: string;
  };
}

export type Actions =
  | DeepReadonly<CreateAction>
  | DeepReadonly<HoverAction>
  | DeepReadonly<LeaveAction>
  | DeepReadonly<SelectAction>

  | DeepReadonly<UpdateAction>
  | DeepReadonly<MoveAction>
  | DeepReadonly<ResizeAction>
  | DeepReadonly<DeleteAction>;

export interface State {
  readonly [id: string]: Element;
}
