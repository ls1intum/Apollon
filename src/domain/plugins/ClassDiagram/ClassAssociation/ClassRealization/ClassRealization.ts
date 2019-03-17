import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassRealization extends ClassAssociation {
  kind = RelationshipKind.ClassRealization;
}

export default ClassRealization;
