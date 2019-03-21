import Relationship from '../../../Relationship';
import Element from '../../../Element';
import { UMLClassAssociation } from '..';

abstract class ClassAssociation extends Relationship {
  multiplicity = { source: '', target: '' };
  role = { source: '', target: '' };

  static toUMLRelationship(
    relationship: ClassAssociation
  ): UMLClassAssociation {
    const umlRelationship = Relationship.toUMLRelationship(relationship);
    return {
      ...umlRelationship,
      source: {
        ...umlRelationship.source,
        multiplicity: relationship.multiplicity.source,
        role: relationship.role.source,
      },
      target: {
        ...umlRelationship.target,
        multiplicity: relationship.multiplicity.target,
        role: relationship.role.target,
      },
    };
  }

  static fromUMLRelationship(
    umlRelationship: UMLClassAssociation,
    elements: Element[]
  ): ClassAssociation {
    const relationship = Relationship.fromUMLRelationship(
      umlRelationship,
      elements,
      ClassAssociation
    ) as ClassAssociation;
    relationship.multiplicity = {
      source: umlRelationship.source.multiplicity,
      target: umlRelationship.target.multiplicity,
    };
    relationship.role = {
      source: umlRelationship.source.role,
      target: umlRelationship.target.role,
    };
    return relationship;
  }
}

export default ClassAssociation;
