import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLObjectAttribute } from './uml-object-attribute/uml-object-attribute';
import { UMLObjectName } from './uml-object-name/uml-object-name';

export const composeObjectPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Object
  const umlObject = new UMLObjectName({ name: translate('packages.ObjectDiagram.ObjectName') });
  umlObject.bounds = {
    ...umlObject.bounds,
    width: umlObject.bounds.width * scale,
    height: umlObject.bounds.height * scale,
  };
  const umlObjectMember = new UMLObjectAttribute({
    name: translate('sidebar.objectAttribute'),
    owner: umlObject.id,
  });
  umlObject.ownedElements = [umlObjectMember.id];
  elements.push(...(umlObject.render(layer, [umlObjectMember]) as UMLElement[]));

  return elements;
};
