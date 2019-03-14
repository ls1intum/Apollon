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

  static get types() {
    return AssociationType;
  }

  constructor(
    name: string,
    source: Port,
    target: Port,
    public type: AssociationType = AssociationType.BidirectionalAssociation
  ) {
    super(name, source, target);
  }
}

export default ClassAssociation;
