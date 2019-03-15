import Relationship from '../../../Relationship';
import Port from '../../../Port';
import { RelationshipKind } from '..';

enum AssociationType {
  BidirectionalAssociation,
  UnidirectionalAssociation,
  Inheritance,
  Realization,
  Dependency,
  Aggregation,
  Composition,
}

class ClassAssociation extends Relationship {
  kind = RelationshipKind.ClassAssociation;

  multiplicity = { source: '*', target: '1' };

  static get types() {
    return AssociationType;
  }

  constructor(
    name: string,
    source: Port,
    target: Port,
    public type: AssociationType = AssociationType.Realization
  ) {
    super(name, source, target);
  }
}

export default ClassAssociation;
