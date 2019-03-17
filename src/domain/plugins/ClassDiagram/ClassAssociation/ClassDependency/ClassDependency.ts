import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassDependency extends ClassAssociation {
  kind = RelationshipKind.ClassDependency;
}

export default ClassDependency;
