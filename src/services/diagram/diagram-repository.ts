import { ModelState } from '../../components/Store';
import { Diagram } from './diagram';

export class DiagramRepository {
  static read = (state: ModelState): Diagram => {
    const { diagram }: ModelState = state;
    return new Diagram(diagram);
  };
}
