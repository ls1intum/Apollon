import { DeepPartial } from 'redux';
import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { IUMLContainer } from '../../../services/uml-container/uml-container.js';
import * as Apollon from '../../../typings.js';
import { assign } from '../../../utils/fx/assign.js';
import { UMLPackage } from '../../common/uml-package/uml-package.js';
import { UMLElementType } from '../../uml-element-type.js';

export interface IUMLDeploymentNode extends IUMLContainer {
  stereotype: string;
}

export class UMLDeploymentNode extends UMLPackage implements IUMLDeploymentNode {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentAssociation,
    DeploymentRelationshipType.DeploymentDependency,
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type: UMLElementType = DeploymentElementType.DeploymentNode;
  stereotype: string = 'node';

  constructor(values?: DeepPartial<IUMLDeploymentNode>) {
    super();
    assign<IUMLDeploymentNode>(this, values);
  }

  serialize(): Apollon.UMLDeploymentNode {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof DeploymentElementType,
      stereotype: this.stereotype,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLDeploymentNode =>
      v.type === DeploymentElementType.DeploymentNode;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.stereotype = values.stereotype;
  }
}
