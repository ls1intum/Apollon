import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { ObjectAttribute } from '../object-diagram/object-member/object-attribute/object-attribute';
import { ObjectName } from '../object-diagram/object-name/object-name';

export const composeCommunicationPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new ObjectName({ name: translate('packages.objectDiagram.objectName') });
  const umlObjectAttribute = new ObjectAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlObject.id,
  });
  umlObject.ownedElements = [umlObjectAttribute.id];
  elements.push(...(umlObject.render(layer, [umlObjectAttribute]) as UMLElement[]));

  return elements;
};
