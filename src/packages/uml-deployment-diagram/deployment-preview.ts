import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLComponent } from '../uml-component-diagram/uml-component/uml-component';
import { UMLDeploymentArtifact } from './uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentNode } from './uml-deployment-node/uml-deployment-node';

export const composeDeploymentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Deployment Node
  const umlDeploymentNode = new UMLDeploymentNode({ name: translate('packages.DeploymentDiagram.DeploymentNode') });
  elements.push(umlDeploymentNode);

  // UML Component
  const umlComponent = new UMLComponent({ name: translate('packages.ComponentDiagram.Component') });
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlDeploymentArtifact = new UMLDeploymentArtifact({ name: translate('packages.DeploymentDiagram.DeploymentArtifact') });
  elements.push(umlDeploymentArtifact);

  return elements;
};
