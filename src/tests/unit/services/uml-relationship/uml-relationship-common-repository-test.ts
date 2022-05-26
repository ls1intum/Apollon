import { UMLClassBidirectional } from '../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { getRealStore } from '../../test-utils/test-utils';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { Direction } from '../../../../main/services/uml-element/uml-element-port';
import { UMLRelationshipCommonRepository } from '../../../../main/services/uml-relationship/uml-relationship-common-repository';
import { UMLRelationship } from '../../../../main/services/uml-relationship/uml-relationship';
import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { createUMLClassWithAttributeAndMethod } from '../../test-utils/test-data';

describe('test UMLRelationshipCommonRepository', () => {
  const realtionships: UMLRelationship[] = [];
  const elements: UMLElement[] = [];
  let umlRelationship: UMLClassBidirectional;

  beforeEach(() => {
    // initialize copy objects
    const srcClassElements = createUMLClassWithAttributeAndMethod();
    const srcElement = srcClassElements[0] as UMLClass;
    const targetClassElements = createUMLClassWithAttributeAndMethod();
    const targetElement = targetClassElements[0] as UMLClass;
    // add existing relationship
    umlRelationship = new UMLClassBidirectional({
      source: { element: srcElement.id, direction: Direction.Up },
      target: { element: targetElement.id, direction: Direction.Up },
    });
    realtionships.push(umlRelationship);
    elements.push(...srcClassElements);
    elements.push(...targetClassElements);
  });

  it('get relationship from state', () => {
    const store = getRealStore(
      {},
      realtionships.map((element) => ({ ...element })),
    );

    const retrievedRelationship = UMLRelationshipCommonRepository.get(umlRelationship);
    // TODO: find out what the problem is here if we compare it to umlRelationship directly
    // TODO: it is a valid test though (remove with TODO above)
    expect(retrievedRelationship).toEqual(new UMLClassBidirectional(umlRelationship));
  });

  it('UMLRelationshipCommonRepository getById from state', () => {
    const store = getRealStore(
      {},
      realtionships.map((element) => ({ ...element })),
    );

    const getByIdAction = UMLRelationshipCommonRepository.getById(umlRelationship.id);
    const retrievedRelationship = store.dispatch(getByIdAction);
    expect(retrievedRelationship).toEqual(umlRelationship);
  });

  it('UMLRelationshipCommonRepository flip target and source of Relationship', () => {
    const store = getRealStore(
      {},
      realtionships.map((element) => ({ ...element })),
    );
    const relationshipBeforeFlip = { ...umlRelationship };

    // flip relationship
    const flipAction = UMLRelationshipCommonRepository.flip(umlRelationship.id);
    store.dispatch(flipAction);

    // assert
    const relationshipAfterFlip = store.getState().elements[umlRelationship.id] as UMLRelationship;
    expect(relationshipAfterFlip.source).toEqual(relationshipBeforeFlip.target);
    expect(relationshipAfterFlip.target).toEqual(relationshipBeforeFlip.source);
  });

  it('UMLRelationshipCommonRepository layout Relationship', () => {
    const store = getRealStore({}, [
      ...realtionships.map((element) => ({ ...element })),
      ...elements.map((element) => ({ ...element })),
    ]);

    // TODO: layout
  });
});
