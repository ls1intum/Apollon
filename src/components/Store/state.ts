import { Entity, Relationship } from '../../core/domain';
import { Size } from '../../core/geometry';
import { UUID } from '../../core/utils';
import { ElementState } from './../../domain/Element';
import { DiagramType, ApollonMode, EditorMode } from '../../gui/types';
import { OptionsState } from './../../domain/Options';

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

  elements: ElementState;

  options: OptionsState;
};

export default State;
