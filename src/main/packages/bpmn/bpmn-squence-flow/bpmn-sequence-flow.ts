import { BPMNRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { ReachabilityGraphRelationshipType } from '../../uml-reachability-graph';
import { DeepPartial } from 'redux';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';

export class BPMNSequenceFlow extends UMLRelationshipCenteredDescription {
  static features = { ...UMLRelationship.features };

  type = BPMNRelationshipType.BPMNSequenceFlow;
  name = '';

  constructor(values?: DeepPartial<IUMLRelationship>) {
    super(values);
    this.name = (values && values.name) || this.name;
  }
}
