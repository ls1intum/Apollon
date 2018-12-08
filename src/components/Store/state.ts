import { Entity, Relationship } from '../../core/domain';
import { Size } from '../../core/geometry';
import { UUID } from '../../core/utils';

type State = {
  entities: {
    byId: { [id: string]: Entity };
    allIds: UUID[];
  };

  relationships: {
    byId: { [id: string]: Relationship };
    allIds: UUID[];
  };

  interactiveElements: {
    allIds: UUID[];
  };

  editor: {
    canvasSize: Size;
    gridSize: number;
  };
};

export default State;
