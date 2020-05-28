import { AsyncAction } from '../../utils/actions/actions';
import { clone, filterRoots } from '../../utils/geometry/tree';
import { notEmpty } from '../../utils/not-empty';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { uuid } from '../../utils/uuid';
import { UMLContainer } from '../uml-container/uml-container';

export class CopyRepository {
  /**
   * Counts how often paste commands are executed to set offset
   */
  static pasteCounter = 0;

  static copy = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    CopyRepository.pasteCounter = 0;
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;
    const state = Object.values(elements)
      .map((x) => UMLElementRepository.get(x))
      .filter(notEmpty);

    const roots = filterRoots(ids, elements);
    const result: UMLElement[] = [];

    for (const root of roots) {
      const element = UMLElementRepository.get(elements[root]);
      if (!element) {
        continue;
      }
      element.owner = null;

      const clones = clone(element, state);
      result.push(...clones);
    }

    navigator.clipboard.writeText(JSON.stringify(result));
  };

  static paste = (): AsyncAction => (dispatch, getState) => {
    CopyRepository.pasteCounter++;

    navigator.clipboard
      .readText()
      .then((value) => {
        const elements: IUMLElement[] = JSON.parse(value);
        let umlElements: IUMLElement[] = elements.filter((element) => UMLElement.isUMLElement(element));
        // creates map old element ids -> copied elements with new ids
        const copyMap = umlElements.reduce((map: any, element: IUMLElement) => {
          const oldId = element.id;
          element.id = uuid();
          map[oldId] = element;
          return map;
        }, {});

        // maps owned elements to new element ids
        umlElements = umlElements.reduce((elements: IUMLElement[], element: IUMLElement) => {
          if (UMLContainer.isUMLContainer(element)) {
            element.bounds.x = element.bounds.x + 10 * CopyRepository.pasteCounter;
            element.bounds.y = element.bounds.y + 10 * CopyRepository.pasteCounter;
            element.ownedElements = element.ownedElements.map((id) => copyMap[id].id);
          }
          return elements;
        }, umlElements);

        return umlElements;
      })
      .then((elements: IUMLElement[]) => {
        dispatch(UMLElementRepository.create(elements));
        dispatch(UMLElementRepository.deselect());
        dispatch(
          UMLElementRepository.select(
            filterRoots(
              elements.map((element) => element.id),
              getState().elements,
            ),
          ),
        );
      });
  };
}
