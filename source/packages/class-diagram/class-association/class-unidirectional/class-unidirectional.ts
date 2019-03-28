import { ClassAssociation } from '../class-association';
import { ClassRelationshipType } from '../..';

export class ClassUnidirectional extends ClassAssociation {
  type = ClassRelationshipType.ClassUnidirectional;
}
