import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassUnidirectional extends ClassAssociation {
  kind = RelationshipKind.ClassUnidirectional;
}

export default ClassUnidirectional;
