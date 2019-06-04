import { UMLElement } from '../../services/uml-element/uml-element';
import { Package } from '../common/package/package';
import { ClassAttribute } from './class-member/class-attribute/class-attribute';
import { ClassMethod } from './class-member/class-method/class-method';
import { Class } from './classifier/class/class';

export const composeClassPreview = (translate: (id: string) => string): UMLElement[] => {
  const umlPackage = new Package();
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
  umlClass.render([umlClassAttribute, umlClassMethod]);
  return [umlPackage, umlClass, umlClassAttribute, umlClassMethod];
};
