import { Relationship } from "../../core/domain";
import Element from './../../domain/Element';
import { Size } from "../../core/geometry";
import { UUID } from './../../domain/utils/uuid';

export interface ReduxState {
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
}
