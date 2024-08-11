import { DeepPartial } from 'redux';
import { UMLPackage } from '../../common/uml-package/uml-package';
import { ComponentElementType, ComponentRelationshipType } from '..';
import { IUMLContainer } from '../../../services/uml-container/uml-container';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';

export interface IUMLSubsystem extends IUMLContainer {
  stereotype: string;
  displayStereotype: boolean;
}

export class UMLSubsystem extends UMLPackage implements IUMLSubsystem {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentDependency,
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  stereotype = 'subsystem';
  displayStereotype = true;
  type = ComponentElementType.Subsystem;

  constructor(values?: DeepPartial<IUMLSubsystem>) {
    super();
    assign<IUMLSubsystem>(this, values);
  }

  serialize(): Apollon.UMLComponentSubsystem {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof ComponentElementType,
      stereotype: this.stereotype,
      displayStereotype: this.displayStereotype,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]): void {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLComponentSubsystem =>
      v.type === ComponentElementType.Subsystem;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.stereotype = values.stereotype;
    this.displayStereotype = values.displayStereotype;
  }
}
