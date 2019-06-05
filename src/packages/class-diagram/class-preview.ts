import { UMLElement } from '../../services/uml-element/uml-element';
import { Package } from '../common/package/package';
import { ClassAttribute } from './class-member/class-attribute/class-attribute';
import { ClassMethod } from './class-member/class-method/class-method';
import { AbstractClass } from './classifier/abstract-class/abstract-class';
import { Class } from './classifier/class/class';
import { Enumeration } from './classifier/enumeration/enumeration';
import { Interface } from './classifier/interface/interface';

export const composeClassPreview = (translate: (id: string) => string): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Package
  const umlPackage = new Package();
  elements.push(umlPackage);

  // Class
  const umlClass = new Class({ name: translate('packages.classDiagram.class') });
  const umlClassAttribute = new ClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlClass.id,
    bounds: { y: 40 },
  });
  const umlClassMethod = new ClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlClass.id,
    bounds: { y: 70 },
  });
  elements.push(...umlClass.render([umlClassAttribute, umlClassMethod]));

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
  elements.push(...umlAbstract.render([umlAbstractAttribute, umlAbstractMethod]));

  // Interface
  const umlInterface = new Interface({ name: translate('packages.classDiagram.interface') });
  const umlInterfaceAttribute = new ClassAttribute({
    name: translate('sidebar.classAttribute'),
    owner: umlInterface.id,
    bounds: { y: 40 },
  });
  const umlInterfaceMethod = new ClassMethod({
    name: translate('sidebar.classMethod'),
    owner: umlInterface.id,
    bounds: { y: 70 },
  });
  elements.push(...umlInterface.render([umlInterfaceAttribute, umlInterfaceMethod]));

  // Enumeration
  const umlEnumeration = new Enumeration({ name: translate('packages.classDiagram.enumeration') });
  const umlEnumerationCase1 = new ClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 1',
    owner: umlEnumeration.id,
  });
  const umlEnumerationCase2 = new ClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 2',
    owner: umlEnumeration.id,
  });
  const umlEnumerationCase3 = new ClassAttribute({
    name: translate('sidebar.enumAttribute') + ' 3',
    owner: umlEnumeration.id,
  });
  elements.push(...umlEnumeration.render([umlEnumerationCase1, umlEnumerationCase2, umlEnumerationCase3]));

  return elements;
};
