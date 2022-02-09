import { ILayer } from '../../services/layouter/layer.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { ComposePreview } from '../compose-preview.js';
import { UMLObjectAttribute } from '../uml-object-diagram/uml-object-attribute/uml-object-attribute.js';
import { UMLObjectName } from '../uml-object-diagram/uml-object-name/uml-object-name.js';

export const composeCommunicationPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new UMLObjectName({ name: translate('packages.CommunicationDiagram.ObjectName') });
  umlObject.bounds = {
    ...umlObject.bounds,
    width: umlObject.bounds.width * scale,
    height: umlObject.bounds.height * scale,
  };
  const umlObjectAttribute = new UMLObjectAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlObject.id,
    bounds: { x: 0, y: 0, width: 200 * scale, height: 30 * scale },
  });
  umlObject.ownedElements = [umlObjectAttribute.id];
  elements.push(...(umlObject.render(layer, [umlObjectAttribute]) as UMLElement[]));

  return elements;
};
