import { DeploymentRelationshipType } from '..';
import { UMLDependency } from '../../common/uml-dependency/uml-component-dependency.js';

export class UMLDeploymentDependency extends UMLDependency {
  type = DeploymentRelationshipType.DeploymentDependency;
}
