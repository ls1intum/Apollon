import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassRealization extends ClassAssociation {
  type = ClassRelationshipType.ClassRealization;
}
