import { ReduxAction } from "../actions";
import { ReduxState } from "../state";
import { computeEntityHeight } from "../../../rendering/layouters/entity";

type State = ReduxState["entities"];

const initialState: State = {
    allIds: [],
    byId: {}
};

export default function entitiesReducer(state = initialState, action: ReduxAction): State {
    switch (action.type) {
        case "CREATE_ENTITY": {
            return {
                allIds: [...state.allIds, action.entity.id],
                byId: {
                    ...state.byId,
                    [action.entity.id]: action.entity
                }
            };
        }

        case "DUPLICATE_SELECTION": {
            const allIds: State["allIds"] = [...state.allIds];
            const byId: State["byId"] = { ...state.byId };
            for (const entity of action.newEntities) {
                allIds.push(entity.id);
                byId[entity.id] = entity;
            }
            return { allIds, byId };
        }

        case "MOVE_ENTITIES": {
            const byId: State["byId"] = { ...state.byId };
            for (const entityId of action.entityIds) {
                const entity = byId[entityId];
                byId[entity.id] = {
                    ...entity,
                    position: {
                        x: entity.position.x + action.offset.dx,
                        y: entity.position.y + action.offset.dy
                    }
                };
            }
            return { ...state, byId };
        }

        case "UPDATE_ENTITY_KIND": {
            const entity = state.byId[action.entityId];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        kind: action.newKind,
                        size: {
                            width: entity.size.width,
                            height: computeEntityHeight(
                                action.newKind,
                                entity.attributes.length,
                                entity.methods.length,
                                entity.renderMode
                            )
                        }
                    }
                }
            };
        }

        case "UPDATE_ENTITY_NAME":
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...state.byId[action.entityId],
                        name: action.newName
                    }
                }
            };

        case "UPDATE_ENTITY_WIDTH": {
            const entity = state.byId[action.entityId];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        size: {
                            width: action.newWidth,
                            height: entity.size.height
                        }
                    }
                }
            };
        }

        case "UPDATE_ENTITY_RENDER_MODE": {
            const entity = state.byId[action.entityId];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        size: {
                            width: entity.size.width,
                            height: computeEntityHeight(
                                entity.kind,
                                entity.attributes.length,
                                entity.methods.length,
                                action.newRenderMode
                            )
                        },
                        renderMode: action.newRenderMode
                    }
                }
            };
        }

        case "DELETE_ENTITIES": {
            const { entityIds } = action;
            if (entityIds.length === 0) {
                return state;
            }
            const allIds = state.allIds.filter(id => !entityIds.includes(id));
            const byId = { ...state.byId };
            for (const entityId of entityIds) {
                delete byId[entityId];
            }
            return { allIds, byId };
        }

        case "CREATE_ENTITY_ATTRIBUTE": {
            const entity = state.byId[action.entityId];
            const attributes = [...entity.attributes, action.attribute];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        size: {
                            width: entity.size.width,
                            height: computeEntityHeight(
                                entity.kind,
                                attributes.length,
                                entity.methods.length,
                                entity.renderMode
                            )
                        },
                        attributes
                    }
                }
            };
        }

        case "CREATE_ENTITY_METHOD": {
            const entity = state.byId[action.entityId];
            const methods = [...entity.methods, action.method];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        size: {
                            width: entity.size.width,
                            height: computeEntityHeight(
                                entity.kind,
                                entity.attributes.length,
                                methods.length,
                                entity.renderMode
                            )
                        },
                        methods
                    }
                }
            };
        }

        case "UPDATE_ENTITY_MEMBER": {
            const entity = state.byId[action.entityId];
            const { member } = action;

            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        attributes: entity.attributes.map(
                            attr => (attr.id === member.id ? member : attr)
                        ),
                        methods: entity.methods.map(
                            method => (method.id === member.id ? member : method)
                        )
                    }
                }
            };
        }

        case "DELETE_ENTITY_MEMBER": {
            const entity = state.byId[action.entityId];
            const attributes = entity.attributes.filter(attr => attr.id !== action.memberId);
            const methods = entity.methods.filter(method => method.id !== action.memberId);

            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...entity,
                        size: {
                            width: entity.size.width,
                            height: computeEntityHeight(
                                entity.kind,
                                attributes.length,
                                methods.length,
                                entity.renderMode
                            )
                        },
                        attributes,
                        methods
                    }
                }
            };
        }

        default:
            return state;
    }
}
