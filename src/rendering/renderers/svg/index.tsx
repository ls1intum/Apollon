import * as React from "react";
import * as ReactDOM from "react-dom";
import RelationshipMarkers from "./defs/RelationshipMarkers";
import RenderedDiagram from "./RenderedDiagram";
import RenderedEntity from "./RenderedEntity";
import RenderedRelationship from "./RenderedRelationship";
import Svg from "./Svg";
import Translate from "./Translate";
import { LayoutedEntity } from "../../layouters/entity";
import { LayoutedRelationship } from "../../../core/domain";
import { computeBoundingBox, Size } from "../../../core/geometry";
import { UUID } from "../../../core/utils";
import { LayoutedDiagram } from "../../../rendering/layouters/diagram";

export interface RenderOptions {
    shouldRenderElement: (id: UUID) => boolean;
    fontFamily: string;
}

export interface RenderedSVG {
    svg: string;
    size: Size;
}

export function renderDiagramToSVG(
    layoutedDiagram: LayoutedDiagram,
    renderOptions: RenderOptions
): RenderedSVG {
    const svg = renderReactElementToString(
        <RenderedDiagram layoutedDiagram={layoutedDiagram} renderOptions={renderOptions} />
    );

    return {
        svg,
        size: layoutedDiagram.size
    };
}

export function renderEntityToSVG(
    layoutedEntity: LayoutedEntity,
    renderOptions: RenderOptions
): RenderedSVG {
    const { position, size } = layoutedEntity;

    const width = size.width + 2;
    const height = size.height + 2;

    const svg = renderReactElementToString(
        <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
            <Translate dx={-position.x + 1} dy={-position.y + 1}>
                <RenderedEntity entity={layoutedEntity} renderOptions={renderOptions} />
            </Translate>
        </Svg>
    );

    return {
        svg,
        size: {
            width,
            height
        }
    };
}

export function renderRelationshipToSVG(
    layoutedRelationship: LayoutedRelationship,
    renderOptions: RenderOptions
): RenderedSVG {
    const PADDING = 30;

    const boundingBox = computeBoundingBox(layoutedRelationship.path);

    const width = boundingBox.width + PADDING;
    const height = boundingBox.height + PADDING;

    const dx = -boundingBox.x + PADDING / 2;
    const dy = -boundingBox.y + PADDING / 2;

    const svg = renderReactElementToString(
        <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
            <defs>
                <RelationshipMarkers onComponentDidMount={undefined} />
            </defs>
            <Translate dx={dx} dy={dy}>
                <RenderedRelationship
                    relationship={layoutedRelationship.relationship}
                    path={layoutedRelationship.path}
                    renderOptions={renderOptions}
                />
            </Translate>
        </Svg>
    );

    return {
        svg,
        size: {
            width,
            height
        }
    };
}

function renderReactElementToString(element: JSX.Element): string {
    // Render our React element into a <div>
    const container = document.createElement("div");
    ReactDOM.render(element, container);

    // Grab the rendered inner HTML as a string
    const { innerHTML } = container;

    // Unmount the React application
    ReactDOM.unmountComponentAtNode(container);

    return innerHTML;
}
