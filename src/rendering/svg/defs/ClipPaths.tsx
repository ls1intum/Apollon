import * as React from "react";
import { Entity } from "../../../core/domain";
import { distinct } from "../../../core/utils/array";
import {
    ENTITY_HORIZONTAL_PADDING,
    ENTITY_KIND_HEIGHT,
    ENTITY_NAME_HEIGHT
} from "../../../layouting/entity";

export default class ClipPaths extends React.Component<Props> {
    render() {
        const { entities } = this.props;
        const entityWidths = distinct(entities.map(entity => entity.size.width)).sort(
            (left, right) => left - right
        );

        return entityWidths.map(width => (
            <React.Fragment key={width}>
                <clipPath id={getEntityNameClipPathId(width)}>
                    <rect
                        x={ENTITY_HORIZONTAL_PADDING}
                        y="0"
                        width={width - 2 * ENTITY_HORIZONTAL_PADDING}
                        height={ENTITY_KIND_HEIGHT + ENTITY_NAME_HEIGHT}
                    />
                </clipPath>

                <clipPath id={getEntityMemberClipPathId(width)}>
                    <rect x="0" y="0" width={width - ENTITY_HORIZONTAL_PADDING} height={9999} />
                </clipPath>
            </React.Fragment>
        ));
    }
}

export function getEntityNameClipPathId(width: number) {
    return `entity-name-clip-path-w${width}`;
}

export function getEntityMemberClipPathId(width: number) {
    return `entity-member-clip-path-w${width}`;
}

interface Props {
    entities: Entity[];
}
