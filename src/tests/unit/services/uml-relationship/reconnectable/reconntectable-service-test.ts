import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { UMLRelationship } from '../../../../../main/services/uml-relationship/uml-relationship';
import { Reconnectable } from '../../../../../main/services/uml-relationship/reconnectable/reconnectable-repository';
import { UMLClassBidirectional } from '../../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { createUMLClassWithAttributeAndMethod } from '../../../test-utils/test-data';

describe('test redux state update when reconnecting uml relationships', () => {
  const elements: UMLElement[] = [];
  let srcElement: UMLClass;
  let targetElement: UMLClass;
  let umlRelationship: UMLRelationship;

  beforeEach(() => {
    // initialize copy objects
    const srcClassElements = createUMLClassWithAttributeAndMethod();
    srcElement = srcClassElements[0] as UMLClass;
    const targetClassElements = createUMLClassWithAttributeAndMethod();
    targetElement = targetClassElements[0] as UMLClass;
    // add existing relationship
    umlRelationship = new UMLClassBidirectional({
      source: { element: srcElement.id, direction: Direction.Up },
      target: { element: targetElement.id, direction: Direction.Up },
    });
    elements.push(umlRelationship, ...srcClassElements, ...targetClassElements);
  });

  it('reconnect existing connection between two elements', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {},
      elements.map((element) => ({ ...element })),
    );
    expect(store.getState().diagram.ownedRelationships).toHaveLength(1);

    const newSrcPort = { element: srcElement.id, direction: Direction.Down, multiplicity: '', role: '' };
    // the endpoint which should be part of the new connection, the other one is replaced
    const endpoint = 'source';

    // test startReconnecting
    store.dispatch(Reconnectable.startReconnecting(endpoint, umlRelationship.id));
    expect(Object.keys(store.getState().reconnecting)).toHaveLength(1);
    expect(umlRelationship.id in store.getState().reconnecting).toBeTruthy();
    expect(store.getState().reconnecting[umlRelationship.id]).toEqual(endpoint);

    // test reconnect
    store.dispatch(Reconnectable.reconnect(newSrcPort));
    // target is replaced, because 'source' should be part of the new connection -> check target
    expect((store.getState().elements[umlRelationship.id] as UMLRelationship)['target']).toEqual(newSrcPort);

    // test endReconnecting
    store.dispatch(Reconnectable.endReconnecting(umlRelationship.id));
    expect(Object.keys(store.getState().reconnecting)).toHaveLength(0);
  });
});
