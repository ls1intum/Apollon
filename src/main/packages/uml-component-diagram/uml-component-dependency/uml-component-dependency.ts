import { ComponentRelationshipType } from '..';
import { UMLDependency } from '../../common/uml-dependency/uml-component-dependency.js';

export class UMLComponentDependency extends UMLDependency {
  type = ComponentRelationshipType.ComponentDependency;
}
