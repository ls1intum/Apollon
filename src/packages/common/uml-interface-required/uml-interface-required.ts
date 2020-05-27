import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export abstract class UMLInterfaceRequired extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };
}
