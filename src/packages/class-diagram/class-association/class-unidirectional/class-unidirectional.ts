import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassUnidirectional extends ClassAssociation {
  type = ClassRelationshipType.ClassUnidirectional;
}
