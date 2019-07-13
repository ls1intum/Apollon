import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLComponentInterface } from './uml-component-interface/uml-component-interface';
import { UMLComponent } from './uml-component/uml-component';

export const composeComponentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Component
  const umlComponent = new UMLComponent({ name: translate('packages.componentDiagram.component') });
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlComponentInterface = new UMLComponentInterface({ name: translate('packages.componentDiagram.interface') });
  const [umlInterface] = umlComponentInterface.render(layer) as [UMLElement];
  elements.push(umlInterface);

  return elements;
};
