import { ModelState } from '../../components/store/model-state';
import { Diagram } from './diagram';

export class DiagramRepository {
  static read = (state: ModelState): Diagram => {
    const { diagram }: ModelState = state;
    return new Diagram(diagram);
  };
}
