import { ObjectElementType } from '../..';
import { UMLElementType } from '../../../uml-element-type';
import { ObjectMember } from '../object-member';

export class ObjectMethod extends ObjectMember {
  type: UMLElementType = ObjectElementType.ObjectMethod;
}
