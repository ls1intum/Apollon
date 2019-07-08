import { ComponentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLComponentDependency extends UMLRelationship {
  type = ComponentRelationshipType.ComponentDependency;
}
