import { Relationship } from '../../core/domain';
import Element from './../../domain/Element';
import { Size } from '../../core/geometry';
import { UUID } from './../../domain/utils/uuid';
import { ElementState } from './../../domain/Element';
import { OptionsState } from './../../domain/Options';

type State = {
  entities: {
    byId: { [id: string]: Element };
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

  elements: ElementState;

  options: OptionsState;
};

export default State;
