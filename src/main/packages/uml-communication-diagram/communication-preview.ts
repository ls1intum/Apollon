import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { computeDimension } from '../../utils/geometry/boundary';
import { ComposePreview } from '../compose-preview';
import { UMLObjectAttribute } from '../uml-object-diagram/uml-object-attribute/uml-object-attribute';
import { UMLObjectName } from '../uml-object-diagram/uml-object-name/uml-object-name';

export const composeCommunicationPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new UMLObjectName({ name: translate('packages.CommunicationDiagram.ObjectName') });
  umlObject.bounds = {
    ...umlObject.bounds,
    width: umlObject.bounds.width,
    height: umlObject.bounds.height,
  };
  const umlObjectAttribute = new UMLObjectAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlObject.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 25),
    },
  });
  umlObject.ownedElements = [umlObjectAttribute.id];
  elements.push(...(umlObject.render(layer, [umlObjectAttribute]) as UMLElement[]));

  return elements;
};
