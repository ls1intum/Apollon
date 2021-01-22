import { FlowchartRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class FlowchartFlowLine extends UMLRelationship {
  type = FlowchartRelationshipType.FlowchartFlowLine;
}
