import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { createUMLClassWithAttributeAndMethod, getRealStore } from '../../../test-utils/test-utils';
import { Connectable } from '../../../../main/services/uml-element/connectable/connectable-repository';
import { Direction } from '../../../../main/services/uml-element/uml-element-port';
import { UMLRelationship } from '../../../../main/services/uml-relationship/uml-relationship';

describe('test redux state update when connecting elements', () => {
  const elements: UMLElement[] = [];
  let srcElement: UMLClass;
  let targetElement: UMLClass;

  beforeEach(() => {
    // initialize copy objects
    const srcClassElements = createUMLClassWithAttributeAndMethod();
    srcElement = srcClassElements[0] as UMLClass;
    const targetClassElements = createUMLClassWithAttributeAndMethod();
    targetElement = targetClassElements[0] as UMLClass;
  });

  it('connect two elements', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().diagram.ownedRelationships).toHaveLength(0);

    const srcPort = { element: srcElement.id, direction: Direction.Up, multiplicity: '', role: '' };
    const targetPort = { element: targetElement.id, direction: Direction.Up, multiplicity: '', role: '' };

    store.dispatch(Connectable.startConnecting(Direction.Up, srcElement.id));
    store.dispatch(Connectable.connect(targetPort));
    store.dispatch(Connectable.endConnecting(targetPort));

    expect(store.getState().diagram.ownedRelationships).toHaveLength(1);
    expect(
      (store.getState().elements[store.getState().diagram.ownedRelationships[0]] as UMLRelationship).source,
    ).toEqual(srcPort);
    expect(
      (store.getState().elements[store.getState().diagram.ownedRelationships[0]] as UMLRelationship).target,
    ).toEqual(targetPort);
  });
});
