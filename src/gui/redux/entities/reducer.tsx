import React from 'react';
import { ReduxAction } from "../actions";
import { ReduxState } from "../state";
import { computeEntityHeight } from "../../../rendering/layouters/entity";
import { EntityKind } from '../../../core/domain';
import * as Plugins from './../../../domain/plugins';
import { EntityMember } from '../../../domain/plugins/class/Member';

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

        case "DUPLICATE_ENTITIES": {
            const allIds: State["allIds"] = [...state.allIds];
            const byId: State["byId"] = { ...state.byId };
            for (const entity of action.newEntities) {
                allIds.push(entity.id);
                byId[entity.id] = entity;
            }
            return { allIds, byId };
        }

        case "MOVE_ENTITY": {
            const byId: State["byId"] = { ...state.byId };
            const entity = byId[action.entityId];
            byId[entity.id] = {
                ...entity,
                render: (options: any) => (<></>),
                bounds: {
                    ...entity.bounds,
                    x: action.position.x,
                    y: action.position.y
                }
            };
            return { ...state, byId };
        }

        case "MOVE_ENTITIES": {
            const byId: State["byId"] = { ...state.byId };
            for (const entityId of action.entityIds) {
                const entity = byId[entityId];
                byId[entity.id] = {
                    ...entity,
                    render: (options: any) => (<></>),
                    bounds: {
                        ...entity.bounds,
                        x: entity.bounds.x + action.offset.dx,
                        y: entity.bounds.y + action.offset.dy
                    }
                };
            }
            return { ...state, byId };
        }

        case "UPDATE_ENTITY_KIND": {
            const entity = state.byId[action.entityId];
            let renderMode = { showAttributes: false, showMethods: false };
            let attributes: EntityMember[] = [];
            let methods: EntityMember[] = [];
            let element;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    renderMode = element.renderMode;
                    attributes = element.attributes;
                    methods = element.methods;
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    renderMode = element.renderMode;
                    attributes = element.attributes;
                    methods = element.methods;
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    renderMode = element.renderMode;
                    attributes = element.attributes;
                    methods = element.methods;
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    renderMode = element.renderMode;
                    attributes = element.attributes;
                    break;
            }
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        render: (options: any) => (<></>),
                        ...entity,
                        kind: action.newKind,
                        bounds: {
                            ...entity.bounds,
                            width: entity.bounds.width,
                            height: computeEntityHeight(
                                action.newKind,
                                attributes.length,
                                methods.length,
                                renderMode
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
                        render: (options: any) => (<></>),
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
                        render: (options: any) => (<></>),
                        bounds: {
                            ...entity.bounds,
                            width: action.newWidth,
                            height: entity.bounds.height
                        }
                    }
                }
            };
        }

        case "UPDATE_ENTITY_RENDER_MODE": {
            const entity = state.byId[action.entityId];
            let element: any;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    element.renderMode = action.newRenderMode;
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    element.renderMode = action.newRenderMode;
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    element.renderMode = action.newRenderMode;
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    element.renderMode = action.newRenderMode;
                    break;
            }
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [entity.id]: {
                        ...element,
                    }
                }
            };
        }

        case "DELETE_ELEMENTS": {
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
            let element: any;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    element.renderMode = element.renderMode;
                    element.attributes = [...element.attributes, action.attribute];
                    element.methods = element.methods;
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    element.renderMode = element.renderMode;
                    element.attributes = [...element.attributes, action.attribute];
                    element.methods = element.methods;
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    element.renderMode = element.renderMode;
                    element.attributes = [...element.attributes, action.attribute];
                    element.methods = element.methods;
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    element.renderMode = element.renderMode;
                    element.attributes = [...element.attributes, action.attribute];
                    element.methods = [];
                    break;
            }
            const height = computeEntityHeight(
                entity.kind,
                element.attributes.length,
                element.methods.length,
                element.renderMode,
            );

            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...element,
                        render: (options: any) => (<></>),
                        bounds: {
                            ...entity.bounds,
                            height,
                        },
                    }
                }
            };
        }

        case "CREATE_ENTITY_METHOD": {
            const entity = state.byId[action.entityId];

            let element: any;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes;
                    element.methods = [...element.methods, action.method];
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes;
                    element.methods = [...element.methods, action.method];
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes;
                    element.methods = [...element.methods, action.method];
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes;
                    element.methods = [];
                    break;
            }
            const height = computeEntityHeight(
                entity.kind,
                element.attributes.length,
                element.methods.length,
                element.renderMode,
            );
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...element,
                        render: (options: any) => (<></>),
                        bounds: {
                            ...entity.bounds,
                            height,
                        },
                    }
                }
            };
        }

        case "UPDATE_ENTITY_MEMBER": {
            const entity = state.byId[action.entityId];
            const { member } = action;
            let element: any;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.map(
                        (attr: EntityMember) => (attr.id === member.id ? member : attr)
                    );
                    element.methods = element.methods.map(
                        (method: EntityMember) => (method.id === member.id ? member : method)
                    );
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.map(
                        (attr: EntityMember) => (attr.id === member.id ? member : attr)
                    );
                    element.methods = element.methods.map(
                        (method: EntityMember) => (method.id === member.id ? member : method)
                    );
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.map(
                        (attr: EntityMember) => (attr.id === member.id ? member : attr)
                    );
                    element.methods = element.methods.map(
                        (method: EntityMember) => (method.id === member.id ? member : method)
                    );
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.map(
                        (attr: EntityMember) => (attr.id === member.id ? member : attr)
                    );
                    break;
            }

            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        render: (options: any) => (<></>),
                        ...element,
                    }
                }
            };
        }

        case "DELETE_ENTITY_MEMBER": {
            const entity = state.byId[action.entityId];
            let element: any;
            switch (entity.kind) {
                case EntityKind.Class:
                    element = entity as Plugins.Class;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.filter(
                        (attr: EntityMember) => (attr.id !== action.memberId)
                    );
                    element.methods = element.methods.filter(
                        (method: EntityMember) => (method.id !== action.memberId)
                    );
                    break;
                case EntityKind.AbstractClass:
                    element = entity as Plugins.AbstractClass;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.filter(
                        (attr: EntityMember) => (attr.id !== action.memberId)
                    );
                    element.methods = element.methods.filter(
                        (method: EntityMember) => (method.id !== action.memberId)
                    );
                    break;
                case EntityKind.Interface:
                    element = entity as Plugins.Interface;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.filter(
                        (attr: EntityMember) => (attr.id !== action.memberId)
                    );
                    element.methods = element.methods.filter(
                        (method: EntityMember) => (method.id !== action.memberId)
                    );
                    break
                case EntityKind.Enumeration:
                    element = entity as Plugins.Enumeration;
                    element.renderMode = element.renderMode;
                    element.attributes = element.attributes.filter(
                        (attr: EntityMember) => (attr.id !== action.memberId)
                    );
                    element.methods = [];
                    break;
            }
            const height = computeEntityHeight(
                entity.kind,
                element.attributes.length,
                element.methods.length,
                element.renderMode,
            );

            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.entityId]: {
                        ...element,
                        render: (options: any) => (<></>),
                        bounds: {
                            ...entity.bounds,
                            height,
                        },
                    }
                }
            };
        }

        default:
            return state;
    }
}
