import { UMLPackage } from '../../common/uml-package/uml-package';
import { ComponentElementType, ComponentRelationshipType } from '..';


export interface IUMLSubsystem {
    stereotype: string;
}

export class UMLSubsystem extends UMLPackage implements IUMLSubsystem {
    stereotype: string = 'subsystem';
    name: string = 'Subsystem';
    static supportedRelationships = [
      ComponentRelationshipType.ComponentDependency,
      ComponentRelationshipType.ComponentInterfaceProvided,
      ComponentRelationshipType.ComponentInterfaceRequired,
    ];
    type = ComponentElementType.Subsystem;
}