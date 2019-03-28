import { ClassAssociation } from '../class-association';
import { ClassRelationshipType } from '../..';

export class ClassDependency extends ClassAssociation {
  type = ClassRelationshipType.ClassDependency;
}
