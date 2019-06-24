import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { Component } from '../component-diagram/component/component';
import { ComposePreview } from '../compose-preview';
import { DeploymentArtifact } from './deployment-artifact/deployment-artifact';
import { DeploymentNode } from './deployment-node/deployment-node';

export const composeDeploymentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Deployment Node
  const umlDeploymentNode = new DeploymentNode({ name: translate('packages.deploymentDiagram.node') });
  elements.push(umlDeploymentNode);

  // UML Component
  const umlComponent = new Component({ name: translate('packages.componentDiagram.component') });
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlDeploymentArtifact = new DeploymentArtifact({ name: translate('packages.deploymentDiagram.artifact') });
  elements.push(umlDeploymentArtifact);

  return elements;
};
