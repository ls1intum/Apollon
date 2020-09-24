import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { UMLComponent } from '../../common/uml-component/uml-component';

export class UMLDeploymentComponent extends UMLComponent {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentAssociation,
    DeploymentRelationshipType.DeploymentDependency,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
    DeploymentRelationshipType.DeploymentInterfaceProvided,
  ];
  type = DeploymentElementType.DeploymentComponent;
}
