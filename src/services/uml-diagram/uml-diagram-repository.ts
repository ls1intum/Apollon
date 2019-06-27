import { AsyncAction } from 'src/utils/actions/actions';
import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLDiagram, UMLDiagram } from './uml-diagram';
import { AppendAction, RemoveAction, UMLDiagramActionTypes } from './uml-diagram-types';

export const UMLDiagramRepository = {
  isUMLDiagram: (element: IUMLElement): element is IUMLDiagram => element.type in UMLDiagramType,

  get: (element?: IUMLElement): UMLDiagram | null => {
    if (!element || !UMLDiagramRepository.isUMLDiagram(element)) {
      return null;
    }

    return new UMLDiagram(element);
  },

  append: (id: string | string[], owner?: string): AsyncAction => (dispatch, getState) => {
    dispatch<AppendAction>({
      type: UMLDiagramActionTypes.APPEND,
      payload: { ids: Array.isArray(id) ? id : [id], owner: owner || getState().diagram.id },
    });
  },

  remove: (id: string | string[]): RemoveAction => ({
    type: UMLDiagramActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id] },
  }),
};
