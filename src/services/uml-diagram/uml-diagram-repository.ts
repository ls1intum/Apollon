import { ModelState } from '../../components/store/model-state';
import { UMLDiagram } from './uml-diagram';

export class UMLDiagramRepository {
  static read = (state: ModelState): UMLDiagram => {
    const { diagram }: ModelState = state;
    return new UMLDiagram(diagram);
  };
}
