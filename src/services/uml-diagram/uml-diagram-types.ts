import { Action } from '../../utils/actions/actions';
import { IUMLDiagram } from './uml-diagram';

export const enum UMLDiagramActionTypes {
  APPEND = '@@element/diagram/APPEND',
}

export type UMLDiagramState = IUMLDiagram;

export type UMLDiagramActions = AppendRelationshipAction;

export type AppendRelationshipAction = Action<UMLDiagramActionTypes.APPEND> & {
  payload: {
    ids: string[];
  };
};
