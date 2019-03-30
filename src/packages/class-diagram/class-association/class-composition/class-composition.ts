import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassComposition extends ClassAssociation {
  type = ClassRelationshipType.ClassComposition;
}
