import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Hoverable } from '../../../../../main/services/uml-element/hoverable/hoverable-repository';
import { createUMLClassWithAttributeAndMethod } from '../../../test-utils/test-data';

describe('test redux state update when hovering elements', () => {
  let elements: UMLElement[] = [];
  let elementToHover: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = createUMLClassWithAttributeAndMethod();
    elementToHover = elements[0] as UMLClass;
  });

  it('hover redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().hovered).toHaveLength(0);

    store.dispatch(Hoverable.hover(elementToHover.id));

    expect(store.getState().hovered).toHaveLength(1);
    expect(store.getState().hovered[0]).toEqual(elementToHover.id);
  });

  it('unhover redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      { hovered: [elementToHover.id] },
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().hovered).toHaveLength(1);

    store.dispatch(Hoverable.leave(elementToHover.id));

    expect(store.getState().hovered).toHaveLength(0);
  });
});
