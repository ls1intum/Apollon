import { ModelState } from '../../components/Store';
import { Diagram } from './Diagram';

class Repository {
  static read = (state: ModelState): Diagram => {
    const { diagram }: ModelState = state;
    return Object.setPrototypeOf(diagram, Diagram.prototype);
  };
}

export default Repository;
