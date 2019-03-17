import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassComposition extends ClassAssociation {
  kind = RelationshipKind.ClassComposition;
}

export default ClassComposition;
