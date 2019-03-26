import ClassAssociation from '../ClassAssociation';
import { RelationshipType, UMLClassAssociation } from '../..';
import { Element } from '../../../../../services/element';

class ClassInheritance extends ClassAssociation {
  type = RelationshipType.ClassInheritance;

  static toUMLRelationship(relationship: ClassAssociation): UMLClassAssociation {
    return ClassAssociation.toUMLRelationship(relationship);
  }

  static fromUMLRelationship(umlRelationship: UMLClassAssociation, elements: Element[]): ClassAssociation {
    return ClassAssociation.fromUMLRelationship(umlRelationship, elements);
  }
}

export default ClassInheritance;
