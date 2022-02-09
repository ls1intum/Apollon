import { ILayer } from '../../services/layouter/layer.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { ComposePreview } from '../compose-preview.js';
import { UMLDeploymentArtifact } from './uml-deployment-artifact/uml-deployment-artifact.js';
import { UMLDeploymentNode } from './uml-deployment-node/uml-deployment-node.js';
import { UMLDeploymentInterface } from './uml-deployment-interface/uml-component-interface.js';
import { UMLDeploymentComponent } from './uml-deployment-component/uml-component.js';

export const composeDeploymentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Deployment Node
  const umlDeploymentNode = new UMLDeploymentNode({ name: translate('packages.DeploymentDiagram.DeploymentNode') });
  umlDeploymentNode.bounds = {
    ...umlDeploymentNode.bounds,
    width: umlDeploymentNode.bounds.width * scale,
    height: umlDeploymentNode.bounds.height * scale,
  };
  elements.push(umlDeploymentNode);

  // UML Component
  const umlComponent = new UMLDeploymentComponent({
    name: translate('packages.DeploymentDiagram.DeploymentComponent'),
  });
  umlComponent.bounds = {
    ...umlComponent.bounds,
    width: umlComponent.bounds.width * scale,
    height: umlComponent.bounds.height * scale,
  };
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlDeploymentArtifact = new UMLDeploymentArtifact({
    name: translate('packages.DeploymentDiagram.DeploymentArtifact'),
  });
  umlDeploymentArtifact.bounds = {
    ...umlDeploymentArtifact.bounds,
    width: umlDeploymentArtifact.bounds.width * scale,
  };
  elements.push(umlDeploymentArtifact);

  // UML Deployment Interface
  const umlDeploymentInterface = new UMLDeploymentInterface({
    name: translate('packages.DeploymentDiagram.DeploymentInterface'),
  });
  umlDeploymentInterface.bounds = {
    ...umlDeploymentInterface.bounds,
    width: umlDeploymentInterface.bounds.width * scale,
    height: umlDeploymentInterface.bounds.height * scale,
  };
  elements.push(umlDeploymentInterface);

  return elements;
};
