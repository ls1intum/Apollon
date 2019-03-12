import { Action as ReduxAction } from 'redux';
import Diagram from './Diagram';
import Omit from '../utils/Omit';

export const enum DiagramType {
  ClassDiagram = 'CLASS',
  ActivityDiagram = 'ACTIVITY',
  UseCaseDiagram = 'USECASE',
}

export const enum ActionTypes {
  ADD_ELEMENT = '@@diagram/ADD_ELEMENT',
  ADD_RELATIONSHIP = '@@diagram/ADD_RELATIONSHIP',
  DELETE_ELEMENT = '@@diagram/DELETE_ELEMENT',
  DELETE_RELATIONSHIP = '@@diagram/DELETE_RELATIONSHIP',
}

export interface AddElementAction extends ReduxAction<ActionTypes.ADD_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface AddRelationshipAction
  extends ReduxAction<ActionTypes.ADD_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export interface DeleteElementAction
  extends ReduxAction<ActionTypes.DELETE_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface DeleteRelationshipAction
  extends ReduxAction<ActionTypes.DELETE_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export type Actions =
  | AddElementAction
  | AddRelationshipAction
  | DeleteElementAction
  | DeleteRelationshipAction;

export interface State
  extends Omit<
    Diagram,
    'render' | 'addElement' | 'removeElement' | 'resizeElement'
  > {}
