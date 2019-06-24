import { DeploymentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class DeploymentAssociation extends UMLRelationship {
  type = DeploymentRelationshipType.DeploymentAssociation;
}
