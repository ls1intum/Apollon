import { ComponentRelationshipType } from '..';
import { UMLDependency } from '../../common/uml-dependency/uml-component-dependency';

export class UMLComponentDependency extends UMLDependency {
  type = ComponentRelationshipType.ComponentDependency;
}
