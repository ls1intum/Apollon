import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassDependency extends ClassAssociation {
  type = ClassRelationshipType.ClassDependency;
}
