import { BPMNRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class BPMNSequenceFlow extends UMLRelationship {
  type = BPMNRelationshipType.BPMNSequenceFlow;
}
