import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLDeploymentArtifact } from './uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentNode } from './uml-deployment-node/uml-deployment-node';
import { UMLDeploymentInterface } from './uml-deployment-interface/uml-component-interface';
import { UMLDeploymentComponent } from './uml-deployment-component/uml-component';

export const composeDeploymentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Deployment Node
  const umlDeploymentNode = new UMLDeploymentNode({ name: translate('packages.DeploymentDiagram.DeploymentNode') });
  elements.push(umlDeploymentNode);

  // UML Component
  const umlComponent = new UMLDeploymentComponent({
    name: translate('packages.DeploymentDiagram.DeploymentComponent'),
  });
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlDeploymentArtifact = new UMLDeploymentArtifact({
    name: translate('packages.DeploymentDiagram.DeploymentArtifact'),
  });
  elements.push(umlDeploymentArtifact);

  // UML Deployment Interface
  const umlDeploymentInterface = new UMLDeploymentInterface({
    name: translate('packages.DeploymentDiagram.DeploymentInterface'),
  });
  elements.push(umlDeploymentInterface);

  return elements;
};
