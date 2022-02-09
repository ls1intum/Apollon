import { ComponentElementType, ComponentRelationshipType } from '..';
import { UMLComponent } from '../../common/uml-component/uml-component.js';

export class UMLComponentComponent extends UMLComponent {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentDependency,
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  type = ComponentElementType.Component;
}
