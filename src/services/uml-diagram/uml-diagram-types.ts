import { Action as ReduxAction } from 'redux';
import { IUMLDiagram } from './uml-diagram';

export const enum UMLDiagramActionTypes {
  UPDATE_BOUNDS = '@@diagram/UPDATE_BOUNDS',
}

export type UMLDiagramActions = UpdateBoundsAction;

export interface UpdateBoundsAction extends ReduxAction<UMLDiagramActionTypes.UPDATE_BOUNDS> {
  payload: {
    width: number;
    height: number;
  };
}

export type UMLDiagramState = IUMLDiagram;
