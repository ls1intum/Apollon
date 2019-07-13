import { UMLDiagramType } from '../../packages/diagram-type';
import { AsyncAction } from '../../utils/actions/actions';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLDiagram, UMLDiagram } from './uml-diagram';
import { AppendRelationshipAction, UMLDiagramActionTypes } from './uml-diagram-types';

export const UMLDiagramRepository = {
  isUMLDiagram: (element: IUMLElement): element is IUMLDiagram => element.type in UMLDiagramType,

  get: (element?: IUMLElement): UMLDiagram | null => {
    if (!element || !UMLDiagramRepository.isUMLDiagram(element)) {
      return null;
    }

    return new UMLDiagram(element);
  },

  append: (id: string | string[]): AsyncAction => (dispatch, getState) => {
    dispatch<AppendRelationshipAction>({
      type: UMLDiagramActionTypes.APPEND,
      payload: { ids: Array.isArray(id) ? id : [id] },
      undoable: false,
    });
  },
};
