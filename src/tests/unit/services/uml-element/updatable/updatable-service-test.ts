import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Updatable } from '../../../../../main/services/uml-element/updatable/updatable-repository';
import { createUMLClassWithAttributeAndMethod } from '../../../test-utils/test-data';

describe('test redux state update when open popup for element', () => {
  let elements: UMLElement[] = [];
  let elementToUpdate: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = createUMLClassWithAttributeAndMethod();
    elementToUpdate = elements[0] as UMLClass;
  });

  it('updateStart redux state update', () => {
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().updating).toHaveLength(0);

    store.dispatch(Updatable.updateStart(elementToUpdate.id));

    expect(store.getState().updating).toHaveLength(1);
    expect(store.getState().updating[0]).toEqual(elementToUpdate.id);
  });

  it('updateEnd redux state update', () => {
    const store = getRealStore(
      { updating: [elementToUpdate.id] },
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().updating).toHaveLength(1);

    store.dispatch(Updatable.updateEnd(elementToUpdate.id));

    expect(store.getState().updating).toHaveLength(0);
  });
});
