import { ClassElementType } from '../..';
import { ClassMember } from '../class-member';

export class ClassAttribute extends ClassMember {
  type = ClassElementType.ClassAttribute;
}
