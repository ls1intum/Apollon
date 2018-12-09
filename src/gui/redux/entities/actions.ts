import { Entity, EntityKind, EntityMember, EntityRenderMode } from "../../../core/domain";
import { Delta, Point } from "../../../core/geometry";
import { assertNever } from "../../../core/utils";
import newId, { UUID } from './../../../domain/utils/uuid';
import { computeEntityHeight, getDefaultEntityWidth } from "../../../rendering/layouters/entity";

export type EntitiesAction =
    | CreateEntityAction
    | DuplicateEntitiesAction
    | MoveEntitiesAction
    | UpdateEntityKindAction
    | UpdateEntityNameAction
    | UpdateEntityWidthAction
    | UpdateEntityRenderModeAction
    | CreateEntityAttributeAction
    | CreateEntityMethodAction
    | UpdateEntityMemberAction
    | DeleteEntityMemberAction;

export interface CreateEntityAction {
    type: "CREATE_ENTITY";
    entity: Entity;
}

export interface DuplicateEntitiesAction {
    type: "DUPLICATE_ENTITIES";
    newEntities: Entity[];
    offset: Delta;
}

export interface MoveEntitiesAction {
    type: "MOVE_ENTITIES";
    entityIds: UUID[];
    offset: Delta;
}

interface UpdateEntityKindAction {
    type: "UPDATE_ENTITY_KIND";
    entityId: UUID;
    newKind: EntityKind;
}

interface UpdateEntityNameAction {
    type: "UPDATE_ENTITY_NAME";
    entityId: UUID;
    newName: string;
}

interface UpdateEntityWidthAction {
    type: "UPDATE_ENTITY_WIDTH";
    entityId: UUID;
    newWidth: number;
}

interface UpdateEntityRenderModeAction {
    type: "UPDATE_ENTITY_RENDER_MODE";
    entityId: UUID;
    newRenderMode: EntityRenderMode;
}

interface CreateEntityAttributeAction {
    type: "CREATE_ENTITY_ATTRIBUTE";
    entityId: UUID;
    attribute: EntityMember;
}

interface CreateEntityMethodAction {
    type: "CREATE_ENTITY_METHOD";
    entityId: UUID;
    method: EntityMember;
}

interface DeleteEntityMemberAction {
    type: "DELETE_ENTITY_MEMBER";
    entityId: UUID;
    memberId: UUID;
}

interface UpdateEntityMemberAction {
    type: "UPDATE_ENTITY_MEMBER";
    entityId: UUID;
    member: EntityMember;
}

export function createEntity(position: Point, kind: EntityKind): CreateEntityAction {
    const { name, attributes, methods, renderMode } = getEntityDefaults(kind);

    return {
        type: "CREATE_ENTITY",
        entity: {
            id: newId(),
            kind,
            name,
            position,
            size: {
                width: getDefaultEntityWidth(kind),
                height: computeEntityHeight(kind, attributes.length, methods.length, renderMode)
            },
            attributes,
            methods,
            renderMode
        }
    };
}

function getEntityDefaults(
    kind: EntityKind
): Pick<Entity, "name" | "attributes" | "methods" | "renderMode"> {
    switch (kind) {
        case EntityKind.AbstractClass:
            return {
                name: "AbstractClass",
                attributes: [{ id: newId(), name: "attribute1" }],
                methods: [{ id: newId(), name: "method1()" }],
                renderMode: { showAttributes: true, showMethods: true }
            };

        case EntityKind.Class:
            return {
                name: "Class",
                attributes: [{ id: newId(), name: "attribute1" }],
                methods: [{ id: newId(), name: "method1()" }],
                renderMode: { showAttributes: true, showMethods: true }
            };

        case EntityKind.Enumeration:
            return {
                name: "Enumeration",
                attributes: [
                    { id: newId(), name: "Case1" },
                    { id: newId(), name: "Case2" },
                    { id: newId(), name: "Case3" }
                ],
                methods: [],
                renderMode: { showAttributes: true, showMethods: false }
            };

        case EntityKind.Interface:
            return {
                name: "Interface",
                attributes: [],
                methods: [{ id: newId(), name: "method1()" }],
                renderMode: { showAttributes: true, showMethods: true }
            };

        case EntityKind.ActivityControlInitialNode:
            return {
                name: "●",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityControlFinalNode:
            return {
                name: "◉",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityActionNode:
            return {
                name: "Action",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityObject:
            return {
                name: "Object",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityMergeNode:
            return {
                name: "Merge Decision",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityForkNode:
            return {
                name: "▮",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        case EntityKind.ActivityForkNodeHorizontal:
            return {
                name: "▮",
                attributes: [],
                methods: [],
                renderMode: { showAttributes: false, showMethods: false }
            };

        default:
            return assertNever(kind);
    }
}

export function duplicateEntities(entities: Entity[], offset: Delta): DuplicateEntitiesAction {
    return {
        type: "DUPLICATE_ENTITIES",
        newEntities: entities.map<Entity>(entity => ({
            ...entity,
            id: newId(),
            position: {
                x: entity.position.x + offset.dx,
                y: entity.position.y + offset.dy
            },
            attributes: entity.attributes.map(attribute => ({
                ...attribute,
                id: newId()
            })),
            methods: entity.methods.map(method => ({
                ...method,
                id: newId()
            }))
        })),
        offset
    };
}

export function moveEntities(entityIds: UUID[], offset: Delta): MoveEntitiesAction {
    return {
        type: "MOVE_ENTITIES",
        entityIds,
        offset
    };
}

export function updateEntityKind(entityId: UUID, newKind: EntityKind): UpdateEntityKindAction {
    return {
        type: "UPDATE_ENTITY_KIND",
        entityId,
        newKind
    };
}

export function updateEntityName(entityId: UUID, newName: string): UpdateEntityNameAction {
    return {
        type: "UPDATE_ENTITY_NAME",
        entityId,
        newName
    };
}

export function updateEntityWidth(entityId: UUID, newWidth: number): UpdateEntityWidthAction {
    return {
        type: "UPDATE_ENTITY_WIDTH",
        entityId,
        newWidth
    };
}

export function updateEntityRenderMode(
    entityId: UUID,
    newRenderMode: EntityRenderMode
): UpdateEntityRenderModeAction {
    return {
        type: "UPDATE_ENTITY_RENDER_MODE",
        entityId,
        newRenderMode
    };
}

export function createEntityAttribute(
    entityId: UUID,
    attribute: EntityMember
): CreateEntityAttributeAction {
    return {
        type: "CREATE_ENTITY_ATTRIBUTE",
        entityId,
        attribute
    };
}

export function createEntityMethod(entityId: UUID, method: EntityMember): CreateEntityMethodAction {
    return {
        type: "CREATE_ENTITY_METHOD",
        entityId,
        method
    };
}

export function deleteEntityMember(entityId: UUID, memberId: UUID): DeleteEntityMemberAction {
    return {
        type: "DELETE_ENTITY_MEMBER",
        entityId,
        memberId
    };
}

export function updateEntityMember(entityId: UUID, member: EntityMember): UpdateEntityMemberAction {
    return {
        type: "UPDATE_ENTITY_MEMBER",
        entityId,
        member
    };
}
