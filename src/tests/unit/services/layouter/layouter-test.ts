import { getRealStore } from '../../test-utils/test-utils';
import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClassPackage } from '../../../../main/packages/uml-class-diagram/uml-class-package/uml-class-package';
import { createUMLClassWithAttributeAndMethod } from '../../test-utils/test-data';

describe('test layouting of elements', () => {
  let elements: UMLElement[] = [];
  let parent: UMLClassPackage;

  beforeEach(() => {
    // initialize  objects
    parent = new UMLClassPackage({ name: 'Parent' });
    const children = createUMLClassWithAttributeAndMethod();
    parent.ownedElements = [children[0].id];
    elements.push(parent, ...children);
  });

  it('render diagram', () => {
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    // TODO: meaningful test
    // render(parent.id);
  });
});
