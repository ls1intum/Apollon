import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { UMLComponent } from '../../common/uml-component/uml-component';

export class UMLDeploymentComponent extends UMLComponent {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentAssociation,
    DeploymentRelationshipType.DeploymentDependency,
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type = DeploymentElementType.DeploymentComponent;
}
