import { ClassElementType } from '..';
import { UMLPackage } from '../../common/uml-package/uml-package';
import { UMLElementType } from '../../uml-element-type';

export class UMLClassPackage extends UMLPackage {
  type: UMLElementType = ClassElementType.Package;
}
