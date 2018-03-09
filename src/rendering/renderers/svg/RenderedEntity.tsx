import * as React from "react";
import { getEntityMemberClipPathId } from "./defs/ClipPaths";
import { SvgRenderOptions } from "./index";
import { Entity, EntityKind, EntityMember } from "../../../core/domain";
import {
    computeEntityHeaderHeight,
    ENTITY_BORDER_THICKNESS,
    ENTITY_HORIZONTAL_PADDING,
    ENTITY_MEMBER_HEIGHT,
    ENTITY_MEMBER_LIST_VERTICAL_PADDING,
    getEntityKindDescriptionOrNull
} from "../../../rendering/layouters/entity";

export default class RenderedEntity extends React.Component<Props> {
    render() {
        const { entity, renderOptions } = this.props;

        if (!renderOptions.shouldRenderElement(entity.id)) {
            return null;
        }

        const { x, y } = entity.position;
        const { width, height } = entity.size;

        const transform = `translate(${x} ${y})`;

        return (
            <g transform={transform}>
                <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="white"
                    stroke="black"
                    strokeWidth="1"
                />

                {this.renderEntityKind()}
                {this.renderClassName()}
                {this.renderClassAttributes()}
                {this.renderClassMethods()}
            </g>
        );
    }

    renderEntityKind() {
        const { kind } = this.props.entity;
        const description = getEntityKindDescriptionOrNull(kind);

        if (description === null) {
            return null;
        }

        const x = this.props.entity.size.width / 2;
        const y = computeEntityHeaderHeight(kind) / 2 - 2;

        return (
            <text x={x} y={y} dominantBaseline="baseline" textAnchor="middle" fontSize="13.6px">
                {description}
            </text>
        );
    }

    renderClassName() {
        const { kind, name, size } = this.props.entity;
        const fontStyle = kind === EntityKind.AbstractClass ? "italic" : undefined;

        const x = size.width / 2;

        let y: number;
        let dominantBaseline: "central" | "hanging";

        if (getEntityKindDescriptionOrNull(kind) === null) {
            y = computeEntityHeaderHeight(kind) / 2;
            dominantBaseline = "central";
        } else {
            y = computeEntityHeaderHeight(kind) / 2 + 2;
            dominantBaseline = "hanging";
        }

        const clipPath = `url(#entity-name-clip-path-w${size.width})`;

        return (
            <text
                x={x}
                y={y}
                dominantBaseline={dominantBaseline}
                textAnchor="middle"
                fontWeight="bold"
                fontStyle={fontStyle}
                clipPath={clipPath}
            >
                {name}
            </text>
        );
    }

    renderClassAttributes() {
        if (!this.props.entity.renderMode.showAttributes) {
            return null;
        }

        const { kind, size, attributes } = this.props.entity;
        const { width } = size;

        const translateY = computeEntityHeaderHeight(kind) + 2 * ENTITY_BORDER_THICKNESS;
        const transform = `translate(0 ${translateY})`;

        return (
            <g transform={transform}>
                <line x1={0} y1={0} x2={width} y2={0} stroke="black" strokeWidth="1" />
                {attributes.map((attribute, index) => this.renderMember(attribute, index))}
            </g>
        );
    }

    renderClassMethods() {
        const { renderMode } = this.props.entity;

        if (!renderMode.showMethods) {
            return null;
        }

        const { kind, size, attributes, methods } = this.props.entity;
        const { width } = size;

        const attributeOffset = renderMode.showAttributes
            ? attributes.length * ENTITY_MEMBER_HEIGHT +
              2 * ENTITY_MEMBER_LIST_VERTICAL_PADDING +
              ENTITY_BORDER_THICKNESS
            : 0;

        const translateY =
            computeEntityHeaderHeight(kind) + 2 * ENTITY_BORDER_THICKNESS + attributeOffset;

        const transform = `translate(0 ${translateY})`;

        return (
            <g transform={transform}>
                <line x1={0} y1={0} x2={width} y2={0} stroke="black" strokeWidth="1" />
                {methods.map((method, index) => this.renderMember(method, index))}
            </g>
        );
    }

    renderMember(member: EntityMember, index: number) {
        const { entity, renderOptions } = this.props;

        if (!renderOptions.shouldRenderElement(member.id)) {
            return null;
        }

        const x = ENTITY_HORIZONTAL_PADDING;
        const y = ENTITY_MEMBER_LIST_VERTICAL_PADDING + (index + 0.5) * ENTITY_MEMBER_HEIGHT;

        const clipPathId = getEntityMemberClipPathId(entity.size.width);
        const clipPath = `url(#${clipPathId})`;

        return (
            <text key={member.id} x={x} y={y} dominantBaseline="central" clipPath={clipPath}>
                {member.name}
            </text>
        );
    }
}

interface Props {
    entity: Entity;
    renderOptions: SvgRenderOptions;
}
