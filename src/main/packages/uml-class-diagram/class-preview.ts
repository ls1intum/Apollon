import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { computeDimension } from '../../utils/geometry/boundary';
import { UMLClassifier } from '../common/uml-classifier/uml-classifier';
import { ComposePreview } from '../compose-preview';
import { UMLAbstractClass } from './uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './uml-class-method/uml-class-method';
import { UMLClassPackage } from './uml-class-package/uml-class-package';
import { UMLClass } from './uml-class/uml-class';
import { UMLEnumeration } from './uml-enumeration/uml-enumeration';
import { UMLInterface } from './uml-interface/uml-interface';

export const composeClassPreview: ComposePreview = (layer: ILayer, translate: (id: string) => string): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLClassifier.stereotypeHeaderHeight = computeDimension(1.0, 50);
  UMLClassifier.nonStereotypeHeaderHeight = computeDimension(1.0, 40);

  // UML Package
  const umlPackage = new UMLClassPackage({ name: translate('packages.ClassDiagram.Package') });
  umlPackage.bounds = {
    ...umlPackage.bounds,
    width: umlPackage.bounds.width,
    height: umlPackage.bounds.height,
  };
  elements.push(umlPackage);

  // UML Class
  const umlClass = new UMLClass({ name: translate('packages.ClassDiagram.Class') });
  umlClass.bounds = {
    ...umlClass.bounds,
    width: umlClass.bounds.width,
    height: umlClass.bounds.height,
  };
  const umlClassAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlClass.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });

  const umlClassMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlClass.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });

  umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  elements.push(...(umlClass.render(layer, [umlClassAttribute, umlClassMethod]) as UMLElement[]));

  // UML Abstract Class
  const umlAbstract = new UMLAbstractClass({ name: translate('packages.ClassDiagram.AbstractClass') });
  umlAbstract.bounds = {
    ...umlAbstract.bounds,
    width: umlAbstract.bounds.width,
    height: umlAbstract.bounds.height,
  };
  const umlAbstractAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlAbstract.id,
    bounds: {
      x: 0,
      y: 40,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  const umlAbstractMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlAbstract.id,
    bounds: {
      x: 0,
      y: 70,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
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
    width: umlInterface.bounds.width,
    height: umlInterface.bounds.height,
  };
  const umlInterfaceAttribute = new UMLClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlInterface.id,
    bounds: {
      x: 0,
      y: 50,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  const umlInterfaceMethod = new UMLClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlInterface.id,
    bounds: {
      x: 0,
      y: 80,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
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
    width: umlEnumeration.bounds.width,
    height: umlEnumeration.bounds.height,
  };
  const umlEnumerationCase1 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 1',
    owner: umlEnumeration.id,
    bounds: {
      x: 0,
      y: 50,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  const umlEnumerationCase2 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 2',
    owner: umlEnumeration.id,
    bounds: {
      x: 0,
      y: 80,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  const umlEnumerationCase3 = new UMLClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 3',
    owner: umlEnumeration.id,
    bounds: {
      x: 0,
      y: 110,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  umlEnumeration.ownedElements = [umlEnumerationCase1.id, umlEnumerationCase2.id, umlEnumerationCase3.id];
  elements.push(
    ...(umlEnumeration.render(layer, [umlEnumerationCase1, umlEnumerationCase2, umlEnumerationCase3]) as UMLElement[]),
  );

  return elements;
};
