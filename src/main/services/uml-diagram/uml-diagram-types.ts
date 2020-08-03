import { Action } from '../../utils/actions/actions';
import { IUMLDiagram } from './uml-diagram';

export const enum UMLDiagramActionTypes {
  APPEND = '@@element/diagram/APPEND',
  BRING_TO_FRONT = '@@element/diagram/BRING_TO_FRONT',
}

export type UMLDiagramState = IUMLDiagram;

export type UMLDiagramActions = AppendRelationshipAction | ReorderElementsAction;

export type AppendRelationshipAction = Action<UMLDiagramActionTypes.APPEND> & {
  payload: {
    ids: string[];
  };
};

export type ReorderElementsAction = Action<UMLDiagramActionTypes.BRING_TO_FRONT> & {
  payload: {
    ids: string[];
  };
};
