import { ClassElementType } from '../..';
import { ClassMember } from '../class-member';

export class ClassMethod extends ClassMember {
  type = ClassElementType.ClassMethod;
}
