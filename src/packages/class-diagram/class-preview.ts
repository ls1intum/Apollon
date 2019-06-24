import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { Package } from '../common/package/package';
import { ComposePreview } from '../compose-preview';
import { ClassAttribute } from './class-member/class-attribute/class-attribute';
import { ClassMethod } from './class-member/class-method/class-method';
import { AbstractClass } from './classifier/abstract-class/abstract-class';
import { Class } from './classifier/class/class';
import { Enumeration } from './classifier/enumeration/enumeration';
import { Interface } from './classifier/interface/interface';

export const composeClassPreview: ComposePreview = (layer: ILayer, translate: (id: string) => string): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Package
  const umlPackage = new Package();
  elements.push(umlPackage);

  // Class
  const umlClass = new Class({ name: translate('packages.classDiagram.class') });
  const umlClassAttribute = new ClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlClass.id,
  });
  const umlClassMethod = new ClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlClass.id,
  });
  umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  elements.push(...(umlClass.render(layer, [umlClassAttribute, umlClassMethod]) as UMLElement[]));

  // Abstract Class
  const umlAbstract = new AbstractClass({ name: translate('packages.classDiagram.abstract') });
  const umlAbstractAttribute = new ClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlAbstract.id,
    bounds: { y: 40 },
  });
  const umlAbstractMethod = new ClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlAbstract.id,
    bounds: { y: 70 },
  });
  umlAbstract.ownedElements = [umlAbstractAttribute.id, umlAbstractMethod.id];
  elements.push(...(umlAbstract.render(layer, [umlAbstractAttribute, umlAbstractMethod]) as UMLElement[]));

  // Interface
  const umlInterface = new Interface({ name: translate('packages.classDiagram.interface'), bounds: { height: 110 } });
  const umlInterfaceAttribute = new ClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlInterface.id,
    bounds: { y: 50 },
  });
  const umlInterfaceMethod = new ClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlInterface.id,
    bounds: { y: 80 },
  });
  umlInterface.ownedElements = [umlInterfaceAttribute.id, umlInterfaceMethod.id];
  elements.push(...(umlInterface.render(layer, [umlInterfaceAttribute, umlInterfaceMethod]) as UMLElement[]));

  // Enumeration
  const umlEnumeration = new Enumeration({
    name: translate('packages.classDiagram.enumeration'),
    bounds: { height: 140 },
  });
  const umlEnumerationCase1 = new ClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 1',
    owner: umlEnumeration.id,
    bounds: { y: 50 },
  });
  const umlEnumerationCase2 = new ClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 2',
    owner: umlEnumeration.id,
    bounds: { y: 80 },
  });
  const umlEnumerationCase3 = new ClassAttribute({
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
