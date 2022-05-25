import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { UMLClassifierUpdate } from '../../../../../main/packages/common/uml-classifier/uml-classifier-update';
import { UMLClassAttribute } from '../../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';

describe('test class association popup', () => {
  let elements: UMLElement[] = [];
  let umlClass: UMLClass;

  beforeEach(() => {
    // initialize  objects
    umlClass = new UMLClass({ id: 'source-test-id' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: umlClass.id,
    });
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
    elements.push(umlClass, umlClassAttribute, umlClassMethod);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLClassifierUpdate element={umlClass} />, { store });
    expect(baseElement).toMatchSnapshot();
  });
});
