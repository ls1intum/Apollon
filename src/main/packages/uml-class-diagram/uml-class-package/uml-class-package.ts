import { ClassElementType } from '..';
import { UMLPackage } from '../../common/uml-package/uml-package.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLClassPackage extends UMLPackage {
  type: UMLElementType = ClassElementType.Package;
}
