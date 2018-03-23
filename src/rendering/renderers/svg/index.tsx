import * as React from "react";
import * as ReactDOM from "react-dom";
import RenderedDiagram from "./RenderedDiagram";
import RenderedEntity from "./RenderedEntity";
import RenderedRelationship from "./RenderedRelationship";
import Svg from "./Svg";
import Translate from "./Translate";
import { LayoutedEntity } from "../../layouters/entity";
import { LayoutedRelationship } from "../../../core/domain";
import { computeBoundingBox } from "../../../core/geometry";
import { UUID } from "../../../core/utils";
import { LayoutedDiagram } from "../../../rendering/layouters/diagram";

export interface RenderOptions {
    shouldRenderElement: (id: UUID) => boolean;
    fontFamily: string;
}

export function renderDiagramToSVG(layoutedDiagram: LayoutedDiagram, renderOptions: RenderOptions) {
    return renderReactElementToString(
        <RenderedDiagram layoutedDiagram={layoutedDiagram} renderOptions={renderOptions} />
    );
}

export function renderEntityToSVG(layoutedEntity: LayoutedEntity, renderOptions: RenderOptions) {
    const { position, size } = layoutedEntity;

    const width = size.width + 2;
    const height = size.height + 2;

    return renderReactElementToString(
        <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
            <Translate dx={-position.x + 1} dy={-position.y + 1}>
                <RenderedEntity entity={layoutedEntity} renderOptions={renderOptions} />
            </Translate>
        </Svg>
    );
}

export function renderRelationshipToSVG(
    layoutedRelationship: LayoutedRelationship,
    renderOptions: RenderOptions
) {
    const boundingBox = computeBoundingBox(layoutedRelationship.path);

    const width = boundingBox.width + 15;
    const height = boundingBox.height + 15;

    return renderReactElementToString(
        <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
            <Translate dx={-boundingBox.x} dy={-boundingBox.y}>
                <RenderedRelationship
                    relationship={layoutedRelationship.relationship}
                    path={layoutedRelationship.path}
                    renderOptions={renderOptions}
                />
            </Translate>
        </Svg>
    );
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
