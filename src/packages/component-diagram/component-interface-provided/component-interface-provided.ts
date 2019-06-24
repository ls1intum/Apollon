import { ComponentRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class ComponentInterfaceProvided extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };

  type = ComponentRelationshipType.ComponentInterfaceProvided;
}
