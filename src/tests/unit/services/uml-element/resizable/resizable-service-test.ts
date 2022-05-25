import { ResizeFrom, UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Resizable } from '../../../../../main/services/uml-element/resizable/resizable-repository';
import { UMLClassPackage } from '../../../../../main/packages/uml-class-diagram/uml-class-package/uml-class-package';

describe('test redux state update when resizing elements', () => {
  let elements: UMLElement[] = [];
  let elementToResize: UMLClass;

  beforeEach(() => {
    // initialize  objects
    elements = [new UMLClassPackage({ name: 'test-element' })];
    elementToResize = elements[0] as UMLClass;
  });

  it('resize redux state update', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().resizing).toHaveLength(0);

    store.dispatch(Resizable.startResizing(elementToResize.id));
    expect(store.getState().resizing).toHaveLength(1);
    expect(store.getState().resizing[0]).toEqual(elementToResize.id);
    const delta = { width: 10, height: 10 };
    store.dispatch(Resizable.resize(delta, ResizeFrom.BOTTOMRIGHT, elementToResize.id));
    expect(store.getState().elements[store.getState().resizing[0]].bounds.width).toEqual(
      elementToResize.bounds.width + delta.width,
    );
    expect(store.getState().elements[store.getState().resizing[0]].bounds.height).toEqual(
      elementToResize.bounds.height + delta.height,
    );
    store.dispatch(Resizable.endResizing(elementToResize.id));
    expect(store.getState().resizing).toHaveLength(0);
  });
});
