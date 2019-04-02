import { UMLClassAssociation } from '..';
import { IRelationship, Relationship } from '../../../services/relationship/relationship';
import { UMLRelationship } from '../../../typings';

export interface IClassAssociation extends IRelationship {
  multiplicity: { source: string; target: string };
  role: { source: string; target: string };
}

export abstract class ClassAssociation extends Relationship {
  static toUMLRelationship(relationship: ClassAssociation): UMLClassAssociation {
    const umlRelationship = Relationship.toUMLRelationship(relationship);
    return {
      ...umlRelationship,
      source: {
        ...umlRelationship.source,
        multiplicity: relationship.multiplicity.source || '',
        role: relationship.role.source || '',
      },
      target: {
        ...umlRelationship.target,
        multiplicity: relationship.multiplicity.target || '',
        role: relationship.role.target || '',
      },
    };
  }
  multiplicity = { source: '', target: '' };
  role = { source: '', target: '' };

  constructor(values?: IClassAssociation);
  constructor(values?: UMLClassAssociation);
  constructor(values?: IRelationship | UMLRelationship);
  constructor(values?: IClassAssociation | UMLClassAssociation) {
    super(values);
    if (!values) return;

    if ('multiplicity' in values) {
      this.multiplicity = { ...values.multiplicity };
      this.role = { ...values.role };
    }

    if ('multiplicity' in values.source) {
      const { multiplicity, role, ...source } = values.source;
      this.source = source;
      this.multiplicity = { ...this.multiplicity, source: multiplicity };
      this.role = { ...this.role, source: role };
    }

    if ('multiplicity' in values.target) {
      const { multiplicity, role, ...target } = values.target;
      this.target = target;
      this.multiplicity = { ...this.multiplicity, target: multiplicity };
      this.role = { ...this.role, target: role };
    }
  }
}
