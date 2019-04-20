import { Action as ReduxAction } from 'redux';
import { Boundary } from '../../utils/geometry/boundary';
import { IUMLDiagram } from './uml-diagram';

export const enum UMLDiagramActionTypes {
  ADD_ELEMENT = '@@diagram/ADD_ELEMENT',
  ADD_RELATIONSHIP = '@@diagram/ADD_RELATIONSHIP',
  DELETE_ELEMENT = '@@diagram/DELETE_ELEMENT',
  DELETE_RELATIONSHIP = '@@diagram/DELETE_RELATIONSHIP',
  UPDATE_BOUNDS = '@@diagram/UPDATE_BOUNDS',
}

export type UMLDiagramActions =
  | AddElementAction
  | AddRelationshipAction
  | DeleteElementAction
  | DeleteRelationshipAction
  | UpdateBoundsAction;

export interface AddElementAction extends ReduxAction<UMLDiagramActionTypes.ADD_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface AddRelationshipAction extends ReduxAction<UMLDiagramActionTypes.ADD_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export interface DeleteElementAction extends ReduxAction<UMLDiagramActionTypes.DELETE_ELEMENT> {
  payload: {
    id: string;
  };
}

export interface DeleteRelationshipAction extends ReduxAction<UMLDiagramActionTypes.DELETE_RELATIONSHIP> {
  payload: {
    id: string;
  };
}

export interface UpdateBoundsAction extends ReduxAction<UMLDiagramActionTypes.UPDATE_BOUNDS> {
  payload: {
    bounds: Boundary;
  };
}

export type UMLDiagramState = IUMLDiagram;
