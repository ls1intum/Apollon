import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLClassifier } from '../common/uml-classifier/uml-classifier';
import { ComposePreview } from '../compose-preview';
import { UMLAbstractClass } from './uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './uml-class-method/uml-class-method';
import { UMLClassPackage } from './uml-class-package/uml-class-package';
import { UMLClass } from './uml-class/uml-class';
import { UMLEnumeration } from './uml-enumeration/uml-enumeration';
import { UMLInterface } from './uml-interface/uml-interface';

export const composeClassPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLClassifier.stereotypeHeaderHeight = 50 * scale;
  UMLClassifier.nonStereotypeHeaderHeight = 40 * scale;

  // UML Package
  const umlPackage = new UMLClassPackage({ name: translate('packages.ClassDiagram.Package') });
  umlPackage.bounds = {
    ...umlPackage.bounds,
    width: umlPackage.bounds.width * scale,
    height: umlPackage.bounds.height * scale,
  };
  elements.push(umlPackage);

  // UML Class
  const umlClass = new UMLClass({ name: translate('packages.ClassDiagram.Class') });
  umlClass.bounds = {
    ...umlClass.bounds,
    width: umlClass.bounds.width * scale,
    height: umlClass.bounds.height * scale,
  };
  const umlClassAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlClass.id,
    bounds: { x: 0, y: 0, width: 200 * scale, height: 30 * scale },
  });

  const umlClassMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlClass.id,
    bounds: { x: 0, y: 0, width: 200 * scale, height: 30 * scale },
  });

  umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  elements.push(...(umlClass.render(layer, [umlClassAttribute, umlClassMethod]) as UMLElement[]));

  // UML Abstract Class
  const umlAbstract = new UMLAbstractClass({ name: translate('packages.ClassDiagram.AbstractClass') });
  umlAbstract.bounds = {
    ...umlAbstract.bounds,
    width: umlAbstract.bounds.width * scale,
    height: umlAbstract.bounds.height * scale,
  };
  const umlAbstractAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlAbstract.id,
    bounds: { x: 0, y: 40 * scale, width: 200 * scale, height: 30 * scale },
  });
  const umlAbstractMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlAbstract.id,
    bounds: { x: 0, y: 70 * scale, width: 200 * scale, height: 30 * scale },
  });
  umlAbstract.ownedElements = [umlAbstractAttribute.id, umlAbstractMethod.id];
  elements.push(...(umlAbstract.render(layer, [umlAbstractAttribute, umlAbstractMethod]) as UMLElement[]));

  // UML Interface
  const umlInterface = new UMLInterface({
    name: translate('packages.ClassDiagram.Interface'),
    bounds: { height: 110 },
  });
  umlInterface.bounds = {
    ...umlInterface.bounds,
    width: umlInterface.bounds.width * scale,
    height: umlInterface.bounds.height * scale,
  };
  const umlInterfaceAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlInterface.id,
    bounds: { x: 0, y: 50 * scale, width: 200 * scale, height: 30 * scale },
  });
  const umlInterfaceMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlInterface.id,
    bounds: { x: 0, y: 80 * scale, width: 200 * scale, height: 30 * scale },
  });
  umlInterface.ownedElements = [umlInterfaceAttribute.id, umlInterfaceMethod.id];
  elements.push(...(umlInterface.render(layer, [umlInterfaceAttribute, umlInterfaceMethod]) as UMLElement[]));

  // UML Enumeration
  const umlEnumeration = new UMLEnumeration({
    name: translate('packages.ClassDiagram.Enumeration'),
    bounds: { height: 140 },
  });
  umlEnumeration.bounds = {
    ...umlEnumeration.bounds,
    width: umlEnumeration.bounds.width * scale,
    height: umlEnumeration.bounds.height * scale,
  };
  const umlEnumerationCase1 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 1',
    owner: umlEnumeration.id,
    bounds: { x: 0, y: 50 * scale, width: 200 * scale, height: Math.round((30 * scale) / 10) * 10 },
  });
  const umlEnumerationCase2 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 2',
    owner: umlEnumeration.id,
    bounds: { x: 0, y: 80 * scale, width: 200 * scale, height: Math.round((30 * scale) / 10) * 10 },
  });
  const umlEnumerationCase3 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 3',
    owner: umlEnumeration.id,
    bounds: { x: 0, y: 110 * scale, width: 200 * scale, height: Math.round((30 * scale) / 10) * 10 },
  });
  umlEnumeration.ownedElements = [umlEnumerationCase1.id, umlEnumerationCase2.id, umlEnumerationCase3.id];
  elements.push(
    ...(umlEnumeration.render(layer, [umlEnumerationCase1, umlEnumerationCase2, umlEnumerationCase3]) as UMLElement[]),
  );

  return elements;
};
