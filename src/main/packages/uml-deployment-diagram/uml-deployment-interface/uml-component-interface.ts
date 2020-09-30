import { UMLElementType } from '../../uml-element-type';
import { DeploymentElementType, DeploymentRelationshipType } from '../index';
import { UMLInterface } from '../../common/uml-interface/uml-interface';

export class UMLDeploymentInterface extends UMLInterface {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type: UMLElementType = DeploymentElementType.DeploymentInterface;
}
