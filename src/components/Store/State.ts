import { UUID } from './../../domain/utils/uuid';
import { ElementState } from './../../domain/Element';
import { DiagramState } from './../../domain/Diagram';
import { EditorState } from './../../services/EditorService';

type State = {
  interactiveElements: {
    allIds: UUID[];
  };
  editor: EditorState;

  diagram: DiagramState;
  elements: ElementState;
};

export default State;
