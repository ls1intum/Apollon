import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLObjectAttribute } from '../uml-object-diagram/uml-object-attribute/uml-object-attribute';
import { UMLObjectName } from '../uml-object-diagram/uml-object-name/uml-object-name';

export const composeCommunicationPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new UMLObjectName({ name: translate('packages.objectDiagram.objectName') });
  const umlObjectAttribute = new UMLObjectAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlObject.id,
  });
  umlObject.ownedElements = [umlObjectAttribute.id];
  elements.push(...(umlObject.render(layer, [umlObjectAttribute]) as UMLElement[]));

  return elements;
};
