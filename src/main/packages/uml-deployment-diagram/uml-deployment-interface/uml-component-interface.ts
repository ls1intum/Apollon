import { UMLElementType } from '../../uml-element-type';
import { DeploymentElementType } from '../index';
import { UMLInterface } from '../../common/uml-interface/uml-interface';

export class UMLDeploymentInterface extends UMLInterface {
  type: UMLElementType = DeploymentElementType.DeploymentInterface;
}
