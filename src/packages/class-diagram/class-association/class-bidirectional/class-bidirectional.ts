import { ClassAssociation } from '../class-association';
import { ClassRelationshipType } from '../..';

export class ClassBidirectional extends ClassAssociation {
  type = ClassRelationshipType.ClassBidirectional;
}
