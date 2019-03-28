import { Action } from 'redux';
import { Element, IElement } from './element';
import { ElementType } from '../../packages/element-type';

export const enum ElementActionTypes {
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

export interface CreateAction extends Action<ElementActionTypes.CREATE> {
  payload: {
    element: Element;
  };
}

export interface HoverAction extends Action<ElementActionTypes.HOVER> {
  payload: {
    id: string;
    internal: boolean;
  };
}

export interface LeaveAction extends Action<ElementActionTypes.LEAVE> {
  payload: {
    id: string;
    internal: boolean;
  };
}

export interface SelectAction extends Action<ElementActionTypes.SELECT> {
  payload: {
    id: string | null;
    toggle: boolean;
  };
}

export interface MakeInteractiveAction extends Action<ElementActionTypes.MAKE_INTERACTIVE> {
  payload: {
    id: string;
  };
}

export interface ResizeAction extends Action<ElementActionTypes.RESIZE> {
  payload: {
    id: string;
    delta: {
      width: number;
      height: number;
    };
  };
}

export interface MoveAction extends Action<ElementActionTypes.MOVE> {
  payload: {
    id: string | null;
    delta: {
      x: number;
      y: number;
    };
  };
}

export interface ChangeAction extends Action<ElementActionTypes.CHANGE> {
  payload: {
    id: string;
    kind: ElementType;
  };
}

export interface RenameAction extends Action<ElementActionTypes.RENAME> {
  payload: {
    id: string;
    name: string;
  };
}

export interface UpdateAction extends Action<ElementActionTypes.UPDATE> {
  payload: {
    id: string;
    values: Partial<Element>;
  };
}

export interface DeleteAction extends Action<ElementActionTypes.DELETE> {
  payload: {
    id: string | null;
  };
}

export type ElementActions =
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

export interface ElementState {
  readonly [id: string]: IElement;
}
