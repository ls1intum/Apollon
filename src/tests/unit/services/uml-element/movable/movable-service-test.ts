import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Movable } from '../../../../../main/services/uml-element/movable/movable-repository';
import { createUMLClassWithAttributeAndMethod } from '../../../test-utils/test-data';

describe('test redux state update when moving elements', () => {
  let elements: UMLElement[] = [];
  let elementToMove: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = createUMLClassWithAttributeAndMethod();
    elementToMove = elements[0] as UMLClass;
  });

  it('moving redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().moving).toHaveLength(0);

    store.dispatch(Movable.startMoving(elementToMove.id));
    expect(store.getState().moving).toHaveLength(1);
    expect(store.getState().moving[0]).toEqual(elementToMove.id);
    const delta = { x: 10, y: 10 };
    store.dispatch(Movable.move(delta, elementToMove.id));
    expect(store.getState().elements[store.getState().moving[0]].bounds.x).toEqual(elementToMove.bounds.x + delta.x);
    expect(store.getState().elements[store.getState().moving[0]].bounds.y).toEqual(elementToMove.bounds.y + delta.y);
    store.dispatch(Movable.endMoving(elementToMove.id));
    expect(store.getState().moving).toHaveLength(0);
  });
});
