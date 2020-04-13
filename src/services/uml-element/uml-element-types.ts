import { Action } from '../../utils/actions/actions';
import { IUMLElement } from './uml-element';

export const enum UMLElementActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
  DELETE = '@@element/DELETE',
}

export type UMLElementState = {
  readonly [id: string]: IUMLElement;
};

export type UMLElementActions = CreateAction | UpdateAction | DeleteAction;

export type CreateAction<T extends IUMLElement = IUMLElement> = Action<UMLElementActionTypes.CREATE> & {
  payload: {
    values: T[];
  };
};

export type UpdateAction<T extends IUMLElement = IUMLElement> = Action<UMLElementActionTypes.UPDATE> & {
  payload: {
    values: (Pick<T, 'id'> & Partial<T>)[];
  };
};

export type DeleteAction = Action<UMLElementActionTypes.DELETE> & {
  payload: {
    ids: string[];
  };
};
