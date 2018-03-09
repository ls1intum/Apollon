import { EntityKind, EntityRenderMode } from "../core/domain";
import { assertNever } from "../core/utils/never";

export const ENTITY_KIND_HEIGHT = 14;
export const ENTITY_NAME_HEIGHT = 40;

export const ENTITY_HORIZONTAL_PADDING = 12;
export const ENTITY_MEMBER_HEIGHT = 30;
export const ENTITY_MEMBER_LIST_VERTICAL_PADDING = 5;
export const ENTITY_BORDER_THICKNESS = 1;

export function getDefaultEntityWidth() {
    return 200;
}

export function computeEntityHeight(
    kind: EntityKind,
    attributeCount: number,
    methodCount: number,
    renderMode: EntityRenderMode
) {
    let height = 0;

    height += ENTITY_BORDER_THICKNESS;
    height += computeEntityHeaderHeight(kind);
    height += ENTITY_BORDER_THICKNESS;

    if (renderMode.showAttributes) {
        height += 2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING;
        height += attributeCount * ENTITY_MEMBER_HEIGHT;
        height += ENTITY_BORDER_THICKNESS;
    }

    if (renderMode.showMethods) {
        height += 2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING;
        height += methodCount * ENTITY_MEMBER_HEIGHT;
        height += ENTITY_BORDER_THICKNESS;
    }

    return height;
}

export function computeEntityKindHeight(kind: EntityKind) {
    return getEntityKindDescriptionOrNull(kind) === null ? 0 : ENTITY_KIND_HEIGHT;
}

export function computeEntityHeaderHeight(kind: EntityKind) {
    return ENTITY_NAME_HEIGHT + computeEntityKindHeight(kind);
}

export function getEntityKindDescriptionOrNull(kind: EntityKind): string | null {
    switch (kind) {
        case EntityKind.Enumeration:
            return "«enumeration»";

        case EntityKind.Interface:
            return "«interface»";

        case EntityKind.AbstractClass:
        case EntityKind.Class:
            return null;

        default:
            return assertNever(kind);
    }
}
