import { UMLPackage } from '../../common/uml-package/uml-package';
import { ComponentElementType, ComponentRelationshipType } from '..';

export interface IUMLSubsystem {
  stereotype: string;
}

export class UMLSubsystem extends UMLPackage implements IUMLSubsystem {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentDependency,
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  stereotype: string = 'subsystem';
  type = ComponentElementType.Subsystem;
}
