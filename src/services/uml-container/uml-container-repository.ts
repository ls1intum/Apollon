import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { AsyncAction } from '../../utils/actions/actions';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLContainer, UMLContainer } from './uml-container';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types';

export const UMLContainerRepository = {
  isUMLContainer: (element: IUMLElement): element is IUMLContainer => 'ownedElements' in element,

  get: (element?: IUMLElement): UMLContainer | null => {
    if (!element) {
      return null;
    }

    if (UMLDiagramRepository.isUMLDiagram(element)) {
      return UMLDiagramRepository.get(element);
    }

    if (UMLContainerRepository.isUMLContainer(element)) {
      const Classifier = UMLElements[element.type as UMLElementType] as new (values: IUMLElement) => UMLContainer;

      return new Classifier(element);
    }

    return null;
  },

  append: (id: string | string[], owner?: string): AsyncAction => (dispatch, getState) => {
    dispatch<AppendAction>({
      type: UMLContainerActionTypes.APPEND,
      payload: { ids: Array.isArray(id) ? id : [id], owner: owner || getState().diagram.id },
    });
  },

  remove: (id: string | string[]): RemoveAction => ({
    type: UMLContainerActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id] },
  }),
};
