import { ComponentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLComponentInterfaceProvided extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };

  type = ComponentRelationshipType.ComponentInterfaceProvided;
}
