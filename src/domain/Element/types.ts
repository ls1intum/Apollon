import { Action } from 'redux';
import { Element } from '.';
import ElementKind from '../plugins/ElementKind';
import { IElement } from './Element';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  HOVER = '@@element/HOVER',
  LEAVE = '@@element/LEAVE',
  SELECT = '@@element/SELECT',
  MAKE_INTERACTIVE = '@@element/MAKE_INTERACTIVE',
  RESIZE = '@@element/RESIZE',
  MOVE = '@@element/MOVE',
  UPDATE = '@@element/UPDATE',
  CHANGE = '@@element/CHANGE',
  RENAME = '@@element/RENAME',
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

export interface MakeInteractiveAction
  extends Action<ActionTypes.MAKE_INTERACTIVE> {
  payload: {
    id: string;
  };
}

export interface ResizeAction extends Action<ActionTypes.RESIZE> {
  payload: {
    id: string;
    delta: {
      width: number;
      height: number;
    };
  };
}

export interface MoveAction extends Action<ActionTypes.MOVE> {
  payload: {
    id: string | null;
    delta: {
      x: number;
      y: number;
    };
  };
}

export interface ChangeAction extends Action<ActionTypes.CHANGE> {
  payload: {
    id: string;
    kind: ElementKind;
  };
}

export interface RenameAction extends Action<ActionTypes.RENAME> {
  payload: {
    id: string;
    name: string;
  };
}

export interface UpdateAction extends Action<ActionTypes.UPDATE> {
  payload: {
    id: string;
    values: Partial<Element>;
  };
}

export interface DeleteAction extends Action<ActionTypes.DELETE> {
  payload: {
    id: string | null;
  };
}

export type Actions =
  | CreateAction
  | HoverAction
  | LeaveAction
  | SelectAction
  | MakeInteractiveAction
  | ResizeAction
  | MoveAction
  | ChangeAction
  | RenameAction
  | UpdateAction
  | DeleteAction;

export interface State {
  readonly [id: string]: IElement;
}
