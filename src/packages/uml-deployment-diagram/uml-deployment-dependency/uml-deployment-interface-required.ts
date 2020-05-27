import { DeploymentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLDeploymentDependency extends UMLRelationship {
  type = DeploymentRelationshipType.DeploymentDependency;
}
