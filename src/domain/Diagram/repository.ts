import { State } from '../../components/Store';
import Diagram from './Diagram';

class Repository {
  static read = (state: State): Diagram => {
    const { diagram }: State = state;
    return Object.setPrototypeOf(diagram, Diagram.prototype);
  };
}

export default Repository;
