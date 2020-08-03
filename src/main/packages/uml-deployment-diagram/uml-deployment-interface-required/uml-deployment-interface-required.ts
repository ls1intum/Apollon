import { DeploymentRelationshipType } from '..';
import { UMLInterfaceRequired } from '../../common/uml-interface-required/uml-interface-required';

export class UMLDeploymentInterfaceRequired extends UMLInterfaceRequired {
  type = DeploymentRelationshipType.DeploymentInterfaceRequired;
}
