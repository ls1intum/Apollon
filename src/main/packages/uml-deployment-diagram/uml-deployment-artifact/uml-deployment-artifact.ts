import { DeepPartial } from 'redux';
import { DeploymentElementType, DeploymentRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';

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
    this.bounds = calculateNameBounds(this, layer);
    return [this];
  }
}
