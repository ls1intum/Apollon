import { Entity, EntityKind, EntityRenderMode } from "../../core/domain";
import { Point, Size } from "../../core/geometry";
import { assertNever } from "../../core/utils";
import { UUID } from './../../domain/utils/uuid';
import { EntityMember } from '../../domain/plugins/class/Member';

export const ENTITY_KIND_HEIGHT = 14;
export const ENTITY_NAME_HEIGHT = 35;

export const ENTITY_HORIZONTAL_PADDING = 10;
export const ENTITY_MEMBER_HEIGHT = 25;
export const ENTITY_MEMBER_LIST_VERTICAL_PADDING = 5;
export const ENTITY_BORDER_THICKNESS = 1;

export interface LayoutedEntity {
    id: UUID;
    kind: string;
    name: string;
    position: Point;
    size: Size;
    attributes: LayoutedEntityMember[];
    methods: LayoutedEntityMember[];
    renderMode: EntityRenderMode;
}

export interface LayoutedEntityMember {
    id: UUID;
    name: string;
    position: Point;
    size: Size;
}

export function layoutEntity(entity: Entity): LayoutedEntity {
    const { id, kind, name, bounds, attributes, methods, renderMode } = entity;
    const height = computeEntityHeight(kind, attributes.length, methods.length, renderMode);

    const attributeSectionHeight = renderMode.showAttributes
        ? attributes.length * ENTITY_MEMBER_HEIGHT +
          2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING +
          ENTITY_BORDER_THICKNESS
        : 0;

    const headerHeight = computeEntityHeaderHeight(entity.kind);
    const attributeOffsetY = headerHeight + 2 * ENTITY_BORDER_THICKNESS;
    const methodOffsetY = attributeOffsetY + attributeSectionHeight;

    return {
        id,
        kind,
        name,
        position: { x: bounds.x, y: bounds.y },
        size: {
            width: bounds.width,
            height
        },
        attributes: layoutEntityMembers(entity, attributes, attributeOffsetY),
        methods: layoutEntityMembers(entity, methods, methodOffsetY),
        renderMode
    };
}

function layoutEntityMembers(
    entity: Entity,
    members: EntityMember[],
    listPositionY: number
): LayoutedEntityMember[] {
    return members.map((member, index): LayoutedEntityMember => {
        return {
            id: member.id,
            name: member.name,
            position: {
                x: 0,
                y:
                    listPositionY +
                    ENTITY_MEMBER_LIST_VERTICAL_PADDING +
                    index * ENTITY_MEMBER_HEIGHT
            },
            size: {
                width: entity.bounds.width,
                height: ENTITY_MEMBER_HEIGHT
            }
        };
    });
}

export function getDefaultEntityWidth(kind: EntityKind) {
    if (kind === EntityKind.ActivityControlInitialNode || kind === EntityKind.ActivityControlFinalNode) {
        return 40;
    }
    if (kind === EntityKind.ActivityMergeNode) {
        return 60;
    }
    if (kind === EntityKind.ActivityForkNode) {
        return 20;
    }
    if (kind === EntityKind.ActivityForkNodeHorizontal) {
        return 60;
    }

    return 200;
}

export function computeEntityHeight(
    kind: string,
    attributeCount: number,
    methodCount: number,
    renderMode: EntityRenderMode
) {
    if (kind === EntityKind.ActivityControlInitialNode || kind === EntityKind.ActivityControlFinalNode) {
        return 40;
    }
    if (kind === EntityKind.ActivityMergeNode) {
        return 40;
    }
    if (kind === EntityKind.ActivityForkNode) {
        return 60;
    }
    if (kind === EntityKind.ActivityForkNodeHorizontal) {
        return 20;
    }
    if (kind === EntityKind.ActivityActionNode) {
        return 2 * ENTITY_NAME_HEIGHT;
    }
    if (kind === EntityKind.ActivityObject) {
        return ENTITY_NAME_HEIGHT;
    }

    let height = 0;

    // height += ENTITY_BORDER_THICKNESS;
    height += computeEntityHeaderHeight(kind);
    // height += ENTITY_BORDER_THICKNESS;

    if (renderMode.showAttributes) {
        // height += 2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING;
        height += attributeCount * ENTITY_MEMBER_HEIGHT;
        // height += ENTITY_BORDER_THICKNESS;
    }

    if (renderMode.showMethods) {
        // height += 2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING;
        height += methodCount * ENTITY_MEMBER_HEIGHT;
        // height += ENTITY_BORDER_THICKNESS;
    }

    return height;
}

export function computeEntityKindHeight(kind: string) {
    return getEntityKindDescriptionOrNull(kind) === null ? 0 : ENTITY_KIND_HEIGHT;
}

export function computeEntityHeaderHeight(kind: string) {
    if (kind === EntityKind.ActivityActionNode) {
        return 2 * ENTITY_NAME_HEIGHT;
    }
    return ENTITY_NAME_HEIGHT + computeEntityKindHeight(kind);
}

export function getEntityKindDescriptionOrNull(kind: string): string | null {
    switch (kind) {
        case EntityKind.Enumeration:
            return "«enumeration»";

        case EntityKind.Interface:
            return "«interface»";

        case EntityKind.AbstractClass:
        case EntityKind.Class:
        case EntityKind.ActivityControlInitialNode:
        case EntityKind.ActivityControlFinalNode:
        case EntityKind.ActivityActionNode:
        case EntityKind.ActivityObject:
        case EntityKind.ActivityMergeNode:
        case EntityKind.ActivityForkNode:
        case EntityKind.ActivityForkNodeHorizontal:
        default:
            return null;
    }
}
