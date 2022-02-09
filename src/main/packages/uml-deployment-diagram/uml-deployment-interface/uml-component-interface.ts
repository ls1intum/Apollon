import { UMLElementType } from '../../uml-element-type';
import { DeploymentElementType, DeploymentRelationshipType } from '../index.js';
import { UMLInterface } from '../../common/uml-interface/uml-interface.js';

export class UMLDeploymentInterface extends UMLInterface {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type: UMLElementType = DeploymentElementType.DeploymentInterface;
}
