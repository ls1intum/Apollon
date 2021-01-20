import { ControlFlowRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class ControlFlowFlowLine extends UMLRelationship {
  type = ControlFlowRelationshipType.ControlFlowFlowLine;
}
