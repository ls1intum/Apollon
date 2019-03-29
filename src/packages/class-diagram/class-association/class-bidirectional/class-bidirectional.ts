import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassBidirectional extends ClassAssociation {
  type = ClassRelationshipType.ClassBidirectional;
}
