import { ComponentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ComponentInterfaceRequired extends Relationship {
  type = ComponentRelationshipType.ComponentInterfaceRequired;
}
