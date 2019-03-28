import { Relationship, IRelationship } from '../../../services/relationship/relationship';
import { UMLClassAssociation } from '..';
import { UMLRelationship } from '../../../typings';

export abstract class ClassAssociation extends Relationship {
  multiplicity = { source: '', target: '' };
  role = { source: '', target: '' };

  constructor(values?: IRelationship);
  constructor(values?: UMLClassAssociation);
  constructor(values?: IRelationship | UMLRelationship);
  constructor(values?: IRelationship | UMLClassAssociation) {
    super();
    if (values && 'multiplicity' in values.source) {
      const { multiplicity, role, ...source } = values.source;
      values.source = source;
      this.multiplicity = { ...this.multiplicity, source: multiplicity };
      this.role = { ...this.role, source: role };
    }
    if (values && 'multiplicity' in values.target) {
      const { multiplicity, role, ...target } = values.target;
      values.target = target;
      this.multiplicity = { ...this.multiplicity, target: multiplicity };
      this.role = { ...this.role, target: role };
    }
    Object.assign(this, values);
  }

  static toUMLRelationship(relationship: ClassAssociation): UMLClassAssociation {
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
}
