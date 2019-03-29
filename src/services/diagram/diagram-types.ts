import { Action as ReduxAction } from 'redux';
import { IDiagram } from './diagram';

export const enum DiagramActionTypes {
  ADD_ELEMENT = '@@diagram/ADD_ELEMENT',
  ADD_RELATIONSHIP = '@@diagram/ADD_RELATIONSHIP',
  DELETE_ELEMENT = '@@diagram/DELETE_ELEMENT',
  DELETE_RELATIONSHIP = '@@diagram/DELETE_RELATIONSHIP',
}

export type DiagramActions =
  | AddElementAction
  | AddRelationshipAction
  | DeleteElementAction
  | DeleteRelationshipAction;

export interface AddElementAction extends ReduxAction<DiagramActionTypes.ADD_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface AddRelationshipAction
  extends ReduxAction<DiagramActionTypes.ADD_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export interface DeleteElementAction
  extends ReduxAction<DiagramActionTypes.DELETE_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface DeleteRelationshipAction
  extends ReduxAction<DiagramActionTypes.DELETE_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export type DiagramState = IDiagram;
