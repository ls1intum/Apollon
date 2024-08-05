import { ComponentElementType, ComponentRelationshipType } from '..';
import { IUMLComponent, UMLComponent } from '../../common/uml-component/uml-component';
import { DeepPartial } from 'redux';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';

export class UMLComponentComponent extends UMLComponent {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentDependency,
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  type = ComponentElementType.Component;

  constructor(values?: DeepPartial<IUMLComponent>) {
    super();
    assign<IUMLComponent>(this, values);
  }

  serialize(): Apollon.UMLComponentComponent {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof ComponentElementType,
      displayStereotype: this.displayStereotype,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]): void {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLComponentComponent =>
      v.type === ComponentElementType.Component;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.displayStereotype = values.displayStereotype;
  }
}
