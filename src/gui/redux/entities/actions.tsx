import React from 'react';
import { EntityKind, EntityRenderMode } from "../../../core/domain";
import Element from './../../../domain/Element';
import { Delta, Point } from "../../../core/geometry";
import { assertNever } from "../../../core/utils";
import newId, { UUID } from './../../../domain/utils/uuid';
import { computeEntityHeight, getDefaultEntityWidth } from "../../../rendering/layouters/entity";
import * as Plugins from './../../../domain/plugins';
import { EntityMember } from '../../../domain/plugins/class/Member';

export type EntitiesAction =
    | CreateEntityAction
    | DuplicateEntitiesAction
    | MoveEntityAction
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
    entity: Element;
}

export interface DuplicateEntitiesAction {
    type: "DUPLICATE_ENTITIES";
    newEntities: Element[];
    offset: Delta;
}

export interface MoveEntityAction {
    type: "MOVE_ENTITY";
    entityId: UUID;
    position: { x: number, y: number };
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

export function createEntity(entity: Element): CreateEntityAction {
    const { kind } = entity;
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

    const size = {
        width: getDefaultEntityWidth(kind as EntityKind),
        height: computeEntityHeight(kind, attributes.length, methods.length, renderMode)
    };

    return {
        type: "CREATE_ENTITY",
        entity: { ...entity, bounds: { ...entity.bounds, ...size }, render: (options: any) => (<></>),},
    };
}

export function duplicateEntities(entities: Element[], offset: Delta): DuplicateEntitiesAction {
    return {
        type: "DUPLICATE_ENTITIES",
        newEntities: entities.map<Element>(entity => ({
            ...entity,
            id: newId(),
            bounds: {
                ...entity.bounds,
                x: entity.bounds.x + offset.dx,
                y: entity.bounds.y + offset.dy
            },
            // attributes: entity.attributes.map(attribute => ({
            //     ...attribute,
            //     id: newId()
            // })),
            // methods: entity.methods.map(method => ({
            //     ...method,
            //     id: newId()
            // })),
            render: (options: any) => (<></>),
        })),
        offset
    };
}

export function moveEntity(entityId: UUID, position: { x: number, y: number }): MoveEntityAction {
    return {
        type: "MOVE_ENTITY",
        entityId,
        position
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
