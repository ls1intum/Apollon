import { DeploymentRelationshipType } from '..';
import { UMLDependency } from '../../common/uml-dependency/uml-component-dependency';

export class UMLDeploymentDependency extends UMLDependency {
  type = DeploymentRelationshipType.DeploymentDependency;
}
