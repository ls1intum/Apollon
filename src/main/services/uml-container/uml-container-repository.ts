import { UMLElementType } from '../../packages/uml-element-type.js';
import { UMLElements } from '../../packages/uml-elements.js';
import { AsyncAction } from '../../utils/actions/actions.js';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository.js';
import { AppendRelationshipAction, UMLDiagramActionTypes } from '../uml-diagram/uml-diagram-types.js';
import { IUMLElement, UMLElement } from '../uml-element/uml-element.js';
import { UMLRelationship } from '../uml-relationship/uml-relationship.js';
import { UMLContainer } from './uml-container.js';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types.js';

export const UMLContainerRepository = {
  get: (element?: IUMLElement): UMLContainer | null => {
    if (!element) {
      return null;
    }

    if (UMLDiagramRepository.isUMLDiagram(element)) {
      return UMLDiagramRepository.get(element);
    }

    if (UMLContainer.isUMLContainer(element)) {
      const Classifier = UMLElements[element.type as UMLElementType] as new (values: IUMLElement) => UMLContainer;

      return new Classifier(element);
    }

    return null;
  },

  append:
    (id: string | string[], owner?: string): AsyncAction =>
    (dispatch, getState) => {
      const ids = Array.isArray(id) ? id : [id];
      const { elements, diagram } = getState();

      const rels = ids.filter((x) => UMLRelationship.isUMLRelationship(elements[x]));
      if (rels.length) {
        dispatch<AppendRelationshipAction>({
          type: UMLDiagramActionTypes.APPEND,
          payload: { ids: rels },
          undoable: false,
        });
      }

      const eles = ids.filter((x) => UMLElement.isUMLElement(elements[x]));
      if (eles.length) {
        dispatch<AppendAction>({
          type: UMLContainerActionTypes.APPEND,
          payload: { ids: eles, owner: owner || diagram.id },
          undoable: false,
        });
      }
    },

  remove: (id: string | string[]): RemoveAction => ({
    type: UMLContainerActionTypes.REMOVE,
    payload: { ids: Array.isArray(id) ? id : [id] },
    undoable: true,
  }),
};
