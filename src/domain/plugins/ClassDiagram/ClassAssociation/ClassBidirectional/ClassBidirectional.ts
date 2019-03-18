import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassBidirectional extends ClassAssociation {
  kind = RelationshipKind.ClassBidirectional;
}

export default ClassBidirectional;
