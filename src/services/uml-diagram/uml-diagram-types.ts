import { Action } from '../../utils/actions/actions';
import { IUMLDiagram } from './uml-diagram';

export const enum UMLDiagramActionTypes {
  APPEND = '@@element/diagram/APPEND',
  REMOVE = '@@element/diagram/REMOVE',
}

export type UMLDiagramState = IUMLDiagram;

export type UMLDiagramActions = AppendAction | RemoveAction;

export type AppendAction = Action<UMLDiagramActionTypes.APPEND> & {
  payload: {
    ids: string[];
  };
};

export type RemoveAction = Action<UMLDiagramActionTypes.REMOVE> & {
  payload: {
    ids: string[];
  };
};
