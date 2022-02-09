import { SyntaxTreeRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export class SyntaxTreeLink extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };
  type = SyntaxTreeRelationshipType.SyntaxTreeLink;
}
