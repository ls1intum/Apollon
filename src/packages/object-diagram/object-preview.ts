import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { ObjectAttribute } from './object-member/object-attribute/object-attribute';
import { ObjectName } from './object-name/object-name';

export const composeObjectPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new ObjectName({ name: translate('packages.objectDiagram.objectName') });
  const umlObjectMember = new ObjectAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlObject.id,
  });
  umlObject.ownedElements = [umlObjectMember.id];
  elements.push(...(umlObject.render(layer, [umlObjectMember]) as UMLElement[]));

  return elements;
};
