import { AsyncAction } from '../../utils/actions/actions';
import { clone, filterRoots, getChildren } from '../../utils/geometry/tree';
import { notEmpty } from '../../utils/not-empty';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { CopyAction, CopyActionTypes, PasteAction } from './copy-types';
import { UMLElementsForDiagram } from '../../packages/uml-element-type';

export class CopyRepository {
  /**
   * Counts how often paste commands are executed to set offset
   */
  static pasteCounter = 0;

  static copy = (id?: string | string[]): AsyncAction => (dispatch, getState): CopyAction | undefined => {
    CopyRepository.pasteCounter = 0;
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;

    // copy elements with all their child elements, because containers do not know their full children representation
    const idsToClone = getChildren(ids, getState().elements);

    const result: UMLElement[] = idsToClone
      .map((idToClone) => UMLElementRepository.get(elements[idToClone]))
      .filter(notEmpty);
    if (getState().editor.enableCopyPasteToClipboard) {
      navigator.clipboard.writeText(JSON.stringify(result));
      return;
    } else {
      return dispatch<CopyAction>({
        type: CopyActionTypes.COPY,
        payload: idsToClone,
        undoable: false,
      });
    }
  };

  static paste = (): AsyncAction => (dispatch, getState) => {
    CopyRepository.pasteCounter++;

    if (getState().editor.enableCopyPasteToClipboard) {
      navigator.clipboard
        .readText()
        .then((value) => {
          const parsedElements: IUMLElement[] = JSON.parse(value);
          const currentDiagramType = getState().diagram.type;
          // all elements must be supported Apollon elements and part of the current diagram type
          const diagramElements: UMLElement[] = parsedElements
            .map((x) => UMLElementRepository.get(x))
            .filter(notEmpty)
            .filter((element) => element.type in UMLElementsForDiagram[currentDiagramType]);
          return CopyRepository.transformElementsForCopy(diagramElements);
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
    } else {
      const { copy } = getState();
      dispatch<PasteAction>({ type: CopyActionTypes.PASTE, payload: {}, undoable: false });
      const { elements } = getState();
      const elementsToCopy: UMLElement[] = copy
        .map((IdOfCopyElement) => UMLElementRepository.get(elements[IdOfCopyElement]))
        .filter(notEmpty);
      const copiedElements = CopyRepository.transformElementsForCopy(elementsToCopy);
      dispatch(UMLElementRepository.create(copiedElements));
      dispatch(UMLElementRepository.deselect());
      dispatch(
        UMLElementRepository.select(
          filterRoots(
            copiedElements.map((element) => element.id),
            getState().elements,
          ),
        ),
      );
    }
  };

  private static transformElementsForCopy(umlElements: UMLElement[]): IUMLElement[] {
    // roots in diagram Elements
    const roots = umlElements.filter(
      (element) => !element.owner || umlElements.every((innerElement) => innerElement.id !== element.owner),
    );
    // flat map elements to copies
    const copies: UMLElement[] = roots.reduce((clonedElements: UMLElement[], element: UMLElement) => {
      element.owner = null;
      element.bounds.x = element.bounds.x + 10 * CopyRepository.pasteCounter;
      element.bounds.y = element.bounds.y + 10 * CopyRepository.pasteCounter;

      const clones = clone(element, umlElements);
      return clonedElements.concat(...clones);
    }, []);

    // map elements to serializable elements
    return copies.map((element) => ({ ...element }));
  }
}
