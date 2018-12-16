import { Relationship } from '../../core/domain';
import { UUID } from './../../domain/utils/uuid';
import { ElementState } from './../../domain/Element';
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
};

export default State;
