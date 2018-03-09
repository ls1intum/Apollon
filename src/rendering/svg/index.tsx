import * as React from "react";
import * as ReactDOM from "react-dom";
import ClassDiagram from "./ClassDiagram";
import { LayoutedDiagram } from "../../layouting/diagram";
import { UUID } from "../../core/utils/uuid";

export interface SvgRenderOptions {
    shouldRenderElement: (id: UUID) => boolean;
    fontFamily: string;
}

export function renderDiagram(
    layoutedDiagram: LayoutedDiagram,
    renderOptions: SvgRenderOptions
): string {
    // We'll use React to dynamically create SVG elements for the diagram
    const diagram = (
        <ClassDiagram layoutedDiagram={layoutedDiagram} renderOptions={renderOptions} />
    );

    // Render our React application into a <div>
    const container = document.createElement("div");
    ReactDOM.render(diagram, container);

    // Grab the rendered SVG as a string
    const svg = container.innerHTML;

    // Unmount the React application
    ReactDOM.unmountComponentAtNode(container);

    // TODO: remove (only used for debugging)
    return svg
        .replace(/<(\/[a-z]+)></g, "<$1>\n    <")
        .replace(/><(?!\/)/g, ">\n    <")
        .replace("    </svg>", "</svg>");
}
