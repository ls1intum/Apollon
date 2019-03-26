import ClassAssociation from '../ClassAssociation';
import { RelationshipKind, UMLClassAssociation } from '../..';
import { Element } from '../../../../../services/element';

class ClassDependency extends ClassAssociation {
  type = RelationshipKind.ClassDependency;

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

export default ClassDependency;
