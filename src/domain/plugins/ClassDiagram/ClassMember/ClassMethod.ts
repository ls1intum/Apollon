import ClassMember from './ClassMember';
import { ElementKind } from '..';

class ClassMethod extends ClassMember {
  kind = ElementKind.ClassMethod;
}

export default ClassMethod;
