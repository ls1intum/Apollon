import * as React from "react";
import * as ReactDOM from "react-dom";
import RenderedDiagram from "./RenderedDiagram";
import { UUID } from "../../../core/utils";
import { LayoutedDiagram } from "../../../rendering/layouters/diagram";

export interface RenderOptions {
    shouldRenderElement: (id: UUID) => boolean;
    fontFamily: string;
}

export function renderDiagram(
    layoutedDiagram: LayoutedDiagram,
    renderOptions: RenderOptions
): string {
    // We'll use React to dynamically create SVG elements for the diagram
    const diagram = (
        <RenderedDiagram layoutedDiagram={layoutedDiagram} renderOptions={renderOptions} />
    );

    // Render our React application into a <div>
    const container = document.createElement("div");
    ReactDOM.render(diagram, container);

    // Grab the rendered SVG as a string
    const svg = container.innerHTML;

    // Unmount the React application
    ReactDOM.unmountComponentAtNode(container);

    return svg;
}
