import Member, { MemberComponent } from './Member';

class Method extends Member {
  constructor(public name: string = ' + method()') {
    super(name);
  }
}

export const MethodComponent = MemberComponent;

export default Method;
