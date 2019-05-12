import { ComponentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ComponentInterfaceProvided extends Relationship {
  type = ComponentRelationshipType.ComponentInterfaceProvided;
}
