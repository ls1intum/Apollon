import { ComponentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ComponentInterfaceRequired extends Relationship {
  static features = { ...Relationship.features, variable: false };

  type = ComponentRelationshipType.ComponentInterfaceRequired;
}
