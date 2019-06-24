import { ObjectElementType } from '../..';
import { UMLElementType } from '../../../uml-element-type';
import { ObjectMember } from '../object-member';

export class ObjectAttribute extends ObjectMember {
  type: UMLElementType = ObjectElementType.ObjectAttribute;
}
