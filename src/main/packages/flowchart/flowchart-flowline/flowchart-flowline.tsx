import { FlowchartRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export class FlowchartFlowline extends UMLRelationship {
  type = FlowchartRelationshipType.FlowchartFlowline;
}
