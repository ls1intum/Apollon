import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Interactable } from '../../../../../main/services/uml-element/interactable/interactable-repository';
import { createUMLClassWithAttributeAndMethod } from '../../../test-utils/test-data';

describe('test redux state update when marking elements as interactive', () => {
  let elements: UMLElement[] = [];
  let element: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = createUMLClassWithAttributeAndMethod();
    element = elements[0] as UMLClass;
  });

  it('mark element as interactive redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().interactive).toHaveLength(0);

    store.dispatch(Interactable.makeInteractive(element.id));

    expect(store.getState().interactive).toHaveLength(1);
    expect(store.getState().interactive[0]).toEqual(element.id);
  });

  it('unmark element as interactive redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      { interactive: [element.id] },
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().interactive).toHaveLength(1);

    store.dispatch(Interactable.unmakeInteractive(element.id));

    expect(store.getState().interactive).toHaveLength(0);
  });
});
