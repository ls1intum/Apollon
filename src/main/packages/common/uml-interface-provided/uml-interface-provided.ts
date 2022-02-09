import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export abstract class UMLInterfaceProvided extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };
}
