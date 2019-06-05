import { UMLElementType } from '../../packages/uml-element-type';
import { Action } from '../../utils/actions/actions';
import { IUMLElement } from './uml-element';

export const enum UMLElementActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
  DELETE = '@@element/DELETE',

  DUPLICATE = '@@element/DUPLICATE',
  CHANGE = '@@element/CHANGE',
  RENAME = '@@element/RENAME',
}

export type UMLElementActions =
  | CreateAction
  | UpdateAction
  | DeleteAction
  | DuplicateAction
  | ChangeAction
  | RenameAction;

export interface CreateAction<T extends IUMLElement = IUMLElement> extends Action<UMLElementActionTypes.CREATE> {
  payload: {
    values: T[];
  };
}

export interface UpdateAction<T extends IUMLElement = IUMLElement> extends Action<UMLElementActionTypes.UPDATE> {
  payload: {
    ids: string[];
    values: Partial<T>;
  };
}

export interface DeleteAction extends Action<UMLElementActionTypes.DELETE> {
  payload: {
    ids: string[];
  };
}

export interface DuplicateAction extends Action<UMLElementActionTypes.DUPLICATE> {
  payload: {
    id: string;
    parent?: string;
  };
}

export interface ChangeAction extends Action<UMLElementActionTypes.CHANGE> {
  payload: {
    id: string;
    kind: UMLElementType;
  };
}

export interface RenameAction extends Action<UMLElementActionTypes.RENAME> {
  payload: {
    id: string;
    name: string;
  };
}

export interface UMLElementState {
  readonly [id: string]: IUMLElement;
}

export type UMLElementFeatures = {
  hoverable: boolean;
  selectable: boolean;
  movable: boolean;
  resizable: boolean | 'WIDTH' | 'HEIGHT';
  connectable: boolean;
  updatable: boolean;
  droppable: boolean;
};
