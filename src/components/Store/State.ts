import { ElementState } from './../../domain/Element';
import { DiagramState } from './../../domain/Diagram';
import { EditorState } from './../../services/EditorService';

type State = {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
};

export default State;
