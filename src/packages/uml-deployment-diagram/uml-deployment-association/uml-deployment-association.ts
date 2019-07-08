import { DeploymentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLDeploymentAssociation extends UMLRelationship {
  type = DeploymentRelationshipType.DeploymentAssociation;
}
