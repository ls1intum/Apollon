import { UMLElement } from '../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';

// ClassDiagram

export const createUMLClassWithAttributeAndMethod = (): UMLElement[] => {
  const umlClass = new UMLClass({ name: 'test-element' });
  const umlClassAttribute = new UMLClassAttribute({
    name: 'attribute',
    owner: umlClass.id,
  });
  const umlClassMethod = new UMLClassMethod({
    name: 'classMethod',
    owner: umlClass.id,
  });
  umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  return [umlClass, umlClassAttribute, umlClassMethod];
};
