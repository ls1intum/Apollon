import { AsyncAction } from '../../utils/actions/actions';
import { clone, filterRoots, getChildren } from '../../utils/geometry/tree';
import { notEmpty } from '../../utils/not-empty';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';

export class CopyRepository {
  /**
   * Counts how often paste commands are executed to set offset
   */
  static pasteCounter = 0;

  static copy = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    CopyRepository.pasteCounter = 0;
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;

    // copy elements with all their child elements, because containers do not know their full children representation
    const idsToClone = getChildren(ids, getState().elements);

    const result: UMLElement[] = idsToClone.map((id) => UMLElementRepository.get(elements[id])).filter(notEmpty);
    navigator.clipboard.writeText(JSON.stringify(result));
  };

  static paste = (): AsyncAction => (dispatch, getState) => {
    CopyRepository.pasteCounter++;

    navigator.clipboard
      .readText()
      .then((value) => {
        const parsedElements: IUMLElement[] = JSON.parse(value);
        const diagramElements: UMLElement[] = parsedElements.map((x) => UMLElementRepository.get(x)).filter(notEmpty);

        // roots in diagram Elements
        const roots = diagramElements.filter(
          (element) => !element.owner || diagramElements.every((innerElement) => innerElement.id !== element.owner),
        );
        // flat map elements to copies
        const copies: UMLElement[] = roots.reduce((clonedElements: UMLElement[], element: UMLElement) => {
          element.owner = null;
          element.bounds.x = element.bounds.x + 10 * CopyRepository.pasteCounter;
          element.bounds.y = element.bounds.y + 10 * CopyRepository.pasteCounter;

          const clones = clone(element, diagramElements);
          return clonedElements.concat(...clones);
        }, []);

        // map elements to serializable elements
        return copies.map((element) => ({ ...element }));
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
