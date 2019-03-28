import { ClassAssociation } from '../class-association';
import { ClassRelationshipType } from '../..';

export class ClassComposition extends ClassAssociation {
  type = ClassRelationshipType.ClassComposition;
}
