import ClassAssociation from '../ClassAssociation';
import { RelationshipKind, UMLClassAssociation } from '../..';
import { Element } from '../../../../Element';

class ClassComposition extends ClassAssociation {
  type = RelationshipKind.ClassComposition;

  static toUMLRelationship(
    relationship: ClassAssociation
  ): UMLClassAssociation {
    return ClassAssociation.toUMLRelationship(relationship);
  }

  static fromUMLRelationship(
    umlRelationship: UMLClassAssociation,
    elements: Element[]
  ): ClassAssociation {
    return ClassAssociation.fromUMLRelationship(umlRelationship, elements);
  }
}

export default ClassComposition;
