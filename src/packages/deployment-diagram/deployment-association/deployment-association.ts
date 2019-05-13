import { DeploymentRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class DeploymentAssociation extends Relationship {
  type = DeploymentRelationshipType.DeploymentAssociation;
}
