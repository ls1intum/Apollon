import { DeploymentRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';

export class UMLDeploymentAssociation extends UMLRelationshipCenteredDescription {
  type = DeploymentRelationshipType.DeploymentAssociation;
}
