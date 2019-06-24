import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { Package } from '../common/package/package';
import { ComposePreview } from '../compose-preview';
import { UMLAbstractClass } from './uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './uml-class-method/uml-class-method';
import { UMLClass } from './uml-class/uml-class';
import { UMLEnumeration } from './uml-enumeration/uml-enumeration';
import { UMLInterface } from './uml-interface/uml-interface';

export const composeClassPreview: ComposePreview = (layer: ILayer, translate: (id: string) => string): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Package
  const umlPackage = new Package();
  elements.push(umlPackage);

  // UML Class
  const umlClass = new UMLClass({ name: translate('packages.classDiagram.class') });
  const umlClassAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlClass.id,
  });
  const umlClassMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlClass.id,
  });
  umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  elements.push(...(umlClass.render(layer, [umlClassAttribute, umlClassMethod]) as UMLElement[]));

  // UML Abstract Class
  const umlAbstract = new UMLAbstractClass({ name: translate('packages.classDiagram.abstract') });
  const umlAbstractAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlAbstract.id,
    bounds: { y: 40 },
  });
  const umlAbstractMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlAbstract.id,
    bounds: { y: 70 },
  });
  umlAbstract.ownedElements = [umlAbstractAttribute.id, umlAbstractMethod.id];
  elements.push(...(umlAbstract.render(layer, [umlAbstractAttribute, umlAbstractMethod]) as UMLElement[]));

  // UML Interface
  const umlInterface = new UMLInterface({
    name: translate('packages.classDiagram.interface'),
    bounds: { height: 110 },
  });
  const umlInterfaceAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlInterface.id,
    bounds: { y: 50 },
  });
  const umlInterfaceMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlInterface.id,
    bounds: { y: 80 },
  });
  umlInterface.ownedElements = [umlInterfaceAttribute.id, umlInterfaceMethod.id];
  elements.push(...(umlInterface.render(layer, [umlInterfaceAttribute, umlInterfaceMethod]) as UMLElement[]));

  // UML Enumeration
  const umlEnumeration = new UMLEnumeration({
    name: translate('packages.classDiagram.enumeration'),
    bounds: { height: 140 },
  });
  const umlEnumerationCase1 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 1',
    owner: umlEnumeration.id,
    bounds: { y: 50 },
  });
  const umlEnumerationCase2 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 2',
    owner: umlEnumeration.id,
    bounds: { y: 80 },
  });
  const umlEnumerationCase3 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 3',
    owner: umlEnumeration.id,
    bounds: { y: 110 },
  });
  umlEnumeration.ownedElements = [umlEnumerationCase1.id, umlEnumerationCase2.id, umlEnumerationCase3.id];
  elements.push(
    ...(umlEnumeration.render(layer, [umlEnumerationCase1, umlEnumerationCase2, umlEnumerationCase3]) as UMLElement[]),
  );

  return elements;
};
