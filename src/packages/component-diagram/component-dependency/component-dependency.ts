import { ComponentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class ComponentDependency extends UMLRelationship {
  type = ComponentRelationshipType.ComponentDependency;
}
