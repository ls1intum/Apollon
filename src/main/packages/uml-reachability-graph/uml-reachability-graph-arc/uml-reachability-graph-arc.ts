import { DeepPartial } from 'redux';
import { ReachabilityGraphRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description.js';

export class UMLReachabilityGraphArc extends UMLRelationshipCenteredDescription {
  static features = { ...UMLRelationship.features };
  static transition = 't';

  type = ReachabilityGraphRelationshipType.ReachabilityGraphArc;
  name = UMLReachabilityGraphArc.transition;

  constructor(values?: DeepPartial<IUMLRelationship>) {
    super(values);
    this.name = (values && values.name) || this.name;
  }
}
