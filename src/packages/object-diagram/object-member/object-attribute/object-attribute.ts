import { ObjectElementType } from '../..';
import { ObjectMember } from '../object-member';

export class ObjectAttribute extends ObjectMember {
  type = ObjectElementType.ObjectAttribute;

  render() {
    return [this];
  }
}
