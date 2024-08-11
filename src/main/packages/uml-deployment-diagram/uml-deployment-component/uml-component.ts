import { DeepPartial } from 'redux';
import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { IUMLComponent } from '../../common/uml-component/uml-component';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';
import { UMLComponent } from '../../common/uml-component/uml-component';

export class UMLDeploymentComponent extends UMLComponent {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentAssociation,
    DeploymentRelationshipType.DeploymentDependency,
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type = DeploymentElementType.DeploymentComponent;

  constructor(values?: DeepPartial<IUMLComponent>) {
    super();
    assign<IUMLComponent>(this, values);
  }

  serialize(): Apollon.UMLDeploymentComponent {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof DeploymentElementType,
      displayStereotype: this.displayStereotype,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]): void {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLDeploymentComponent =>
      v.type === DeploymentElementType.DeploymentComponent;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.displayStereotype = values.displayStereotype;
  }
}
