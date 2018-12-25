import { Relationship } from '../../domain/Relationship';
import { UUID } from './../../domain/utils/uuid';
import { ElementState } from './../../domain/Element';
import { DiagramState } from './../../domain/Diagram';
import { EditorState } from './../../services/EditorService';

type State = {
  relationships: {
    byId: { [id: string]: Relationship };
    allIds: UUID[];
  };

  interactiveElements: {
    allIds: UUID[];
  };

  elements: ElementState;

  editor: EditorState;
  diagram: DiagramState;
};

export default State;
