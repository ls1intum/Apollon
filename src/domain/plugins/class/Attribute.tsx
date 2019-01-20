import Member, { MemberComponent } from './Member';

class Attribute extends Member {
  constructor(public name: string = ' + attribute : Type') {
    super(name);
  }
}

export const AttributeComponent = MemberComponent;

export default Attribute;
