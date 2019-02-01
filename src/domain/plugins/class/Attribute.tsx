import Member, { MemberComponent } from './Member';

class Attribute extends Member {
  readonly kind: string = 'Attribute';

  constructor(public name: string = ' + attribute : Type') {
    super(name);
  }
}

export const AttributeComponent = MemberComponent;

export default Attribute;
