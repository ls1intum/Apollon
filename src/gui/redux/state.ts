import { Size } from "../../geometry";
import { Entity, Relationship } from "../../uml";
import { UUID } from "../../utils/uuid";

export interface ReduxState {
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
}
