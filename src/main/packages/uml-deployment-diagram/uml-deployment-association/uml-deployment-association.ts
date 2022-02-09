import { DeploymentRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description.js';

export class UMLDeploymentAssociation extends UMLRelationshipCenteredDescription {
  type = DeploymentRelationshipType.DeploymentAssociation;
}
