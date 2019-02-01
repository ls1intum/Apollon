import Member, { MemberComponent } from './Member';

class Method extends Member {
  readonly kind: string = 'Method';

  constructor(public name: string = ' + method()') {
    super(name);
  }
}

export const MethodComponent = MemberComponent;

export default Method;
