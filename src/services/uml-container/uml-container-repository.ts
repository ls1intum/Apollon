import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { AsyncAction } from '../../utils/actions/actions';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { AppendRelationshipAction, UMLDiagramActionTypes } from '../uml-diagram/uml-diagram-types';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
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
    const ids = Array.isArray(id) ? id : [id];
    const { elements, diagram } = getState();

    const rels = ids.filter(x => UMLRelationshipRepository.isUMLRelationship(elements[x]));
    if (rels.length) {
      dispatch<AppendRelationshipAction>({
        type: UMLDiagramActionTypes.APPEND,
        payload: { ids: rels },
      });
    }

    const eles = ids.filter(x => UMLElementRepository.isUMLElement(elements[x]));
    if (eles.length) {
      dispatch<AppendAction>({
        type: UMLContainerActionTypes.APPEND,
        payload: { ids: eles, owner: owner || diagram.id },
      });
    }
  },

  remove: (id: string | string[]): RemoveAction => ({
    type: UMLContainerActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id] },
  }),
};
