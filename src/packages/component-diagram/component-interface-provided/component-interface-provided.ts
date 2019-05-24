import { ComponentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ComponentInterfaceProvided extends Relationship {
  static features = { ...Relationship.features, variable: false };

  type = ComponentRelationshipType.ComponentInterfaceProvided;
}
