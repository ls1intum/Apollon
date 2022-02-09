import { DeepPartial } from 'redux';
import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { assign } from '../../../utils/fx/assign.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLDeploymentArtifact extends UMLElement {
  static supportedRelationships = [
    DeploymentRelationshipType.DeploymentAssociation,
    DeploymentRelationshipType.DeploymentDependency,
    DeploymentRelationshipType.DeploymentInterfaceProvided,
    DeploymentRelationshipType.DeploymentInterfaceRequired,
  ];
  type: UMLElementType = DeploymentElementType.DeploymentArtifact;
  bounds: IBoundary = { ...this.bounds, height: 40 };

  constructor(values?: DeepPartial<IUMLElement>) {
    super();
    assign<IUMLElement>(this, values);
    this.bounds.height = (values && values.bounds && values.bounds.height) || 40;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, 40);
    return [this];
  }
}
