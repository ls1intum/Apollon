import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLComponentInterface } from './uml-component-interface/uml-component-interface';
import { UMLComponentComponent } from './uml-component/uml-component-component';

export const composeComponentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Component
  const umlComponent = new UMLComponentComponent({ name: translate('packages.ComponentDiagram.Component') });
  umlComponent.bounds = {
    ...umlComponent.bounds,
    width: umlComponent.bounds.width,
    height: umlComponent.bounds.height,
  };
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlComponentInterface = new UMLComponentInterface({
    name: translate('packages.ComponentDiagram.ComponentInterface'),
  });
  umlComponentInterface.bounds = {
    ...umlComponentInterface.bounds,
    width: umlComponentInterface.bounds.width,
    height: umlComponentInterface.bounds.height,
  };
  const [umlInterface] = umlComponentInterface.render(layer) as [UMLElement];
  elements.push(umlInterface);

  return elements;
};
