import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassInheritance extends ClassAssociation {
  type = ClassRelationshipType.ClassInheritance;
}
