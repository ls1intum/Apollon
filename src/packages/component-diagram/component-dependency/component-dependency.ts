import { ComponentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ComponentDependency extends Relationship {
  type = ComponentRelationshipType.ComponentDependency;
}
