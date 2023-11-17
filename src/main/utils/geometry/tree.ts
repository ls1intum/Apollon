import { UMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement, UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementState } from '../../services/uml-element/uml-element-types';

export function filterRoots(ids: string[], elements: UMLElementState): string[] {
  const getSelection = (root: IUMLElement): string[] => {
    if (ids.includes(root.id)) return [root.id];

    if (UMLContainer.isUMLContainer(root)) {
      return root.ownedElements.reduce<string[]>((selection, id) => [...selection, ...getSelection(elements[id])], []);
    }
    return [];
  };

  return Object.values(elements)
    .filter((element) => !element.owner)
    .reduce<string[]>((selection, element) => [...selection, ...getSelection(element)], []);
}

/**
 * returns the ids of all elements in the hierarchy above the element with the specified id
 * @param id element id which parents should be found
 * @param elements elements in state
 */
export function getAllParents(id: string, elements: UMLElementState): string[] {
  const getParents = (element: IUMLElement): string[] => {
    // reached top
    if (element.owner === null) return [];
    return [element.owner, ...getParents(elements[element.owner])];
  };
  return getParents(elements[id]);
}

export function getChildren(ids: string[], elements: UMLElementState): string[] {
  const result: string[] = [];

  for (const id of ids) {
    const owner = elements[id];
    if (!owner) continue;

    if (UMLContainer.isUMLContainer(owner)) {
      result.push(...getChildren(owner.ownedElements, elements));
    }
    result.push(owner.id);
  }

  return result;
}

export function clone(element: UMLElement, elements: UMLElement[]): UMLElement[] {
  if (!UMLContainer.isUMLContainer(element)) {
    return [element.clone()];
  }

  const result: UMLElement[] = [];
  const cloned = element.clone<UMLContainer>();
  const { ownedElements } = element;
  for (const id of ownedElements) {
    const child = elements.find((prev) => prev.id === id);
    if (!child) {
      continue;
    }

    const [clonedChild, ...clonedChildren] = clone(child, elements);
    clonedChild.owner = cloned.id;

    const index = cloned.ownedElements.findIndex((x) => x === id);
    cloned.ownedElements[index] = clonedChild.id;
    result.push(clonedChild, ...clonedChildren);
  }

  return [cloned, ...result];
}
