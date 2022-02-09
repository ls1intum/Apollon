import { ILayer } from '../../services/layouter/layer.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { ComposePreview } from '../compose-preview.js';
import { UMLComponentInterface } from './uml-component-interface/uml-component-interface.js';
import { UMLComponentComponent } from './uml-component/uml-component-component.js';

export const composeComponentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Component
  const umlComponent = new UMLComponentComponent({ name: translate('packages.ComponentDiagram.Component') });
  umlComponent.bounds = {
    ...umlComponent.bounds,
    width: umlComponent.bounds.width * scale,
    height: umlComponent.bounds.height * scale,
  };
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlComponentInterface = new UMLComponentInterface({
    name: translate('packages.ComponentDiagram.ComponentInterface'),
  });
  umlComponentInterface.bounds = {
    ...umlComponentInterface.bounds,
    width: umlComponentInterface.bounds.width * scale,
    height: umlComponentInterface.bounds.height * scale,
  };
  const [umlInterface] = umlComponentInterface.render(layer) as [UMLElement];
  elements.push(umlInterface);

  return elements;
};
