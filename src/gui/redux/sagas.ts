import { DuplicateEntitiesAction } from ".";
import { call, put, select, takeEvery } from "redux-saga/effects";
import { CreateEntityAction, MoveEntitiesAction, resizeCanvas as createResizeCanvasAction } from "./actions";
import { MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH } from "./editor/reducer";
import { getAllEntities } from "./selectors";
import { ReduxState } from "./state";
import { Size, sizesAreEqual } from "../../core/geometry";
import { UUID } from "../../core/utils";

const CREATE_ENTITY: CreateEntityAction["type"] = "CREATE_ENTITY";
const DUPLICATE_ENTITIES: DuplicateEntitiesAction["type"] = "DUPLICATE_ENTITIES";
const MOVE_ENTITIES: MoveEntitiesAction["type"] = "MOVE_ENTITIES";

export default function* mainSaga(selectEntities: (entityIds: UUID[]) => void) {
    yield takeEvery([MOVE_ENTITIES, CREATE_ENTITY], resizeCanvas);

    yield takeEvery(CREATE_ENTITY, function*(action: CreateEntityAction) {
        yield call(selectEntities, [action.entity.id]);
    });

    yield takeEvery(DUPLICATE_ENTITIES, function*(action: DuplicateEntitiesAction) {
        const entityIds = action.newEntities.map(entity => entity.id);
        yield call(selectEntities, entityIds);
    });
}

function* resizeCanvas() {
    const state: ReduxState = yield select();
    const entities = getAllEntities(state);

    let maxX = 0;
    let maxY = 0;

    for (const { position, size } of entities) {
        maxX = Math.max(maxX, position.x + size.width);
        maxY = Math.max(maxY, position.y + size.height);
    }

    const newSize: Size = {
        width: Math.max(maxX + 1000, MIN_CANVAS_WIDTH),
        height: Math.max(maxY + 1000, MIN_CANVAS_HEIGHT)
    };

    if (!sizesAreEqual(newSize, state.editor.canvasSize)) {
        yield put(createResizeCanvasAction(newSize));
    }
}
