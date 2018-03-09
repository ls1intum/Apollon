import * as React from "react";
import ClipPaths from "./defs/ClipPaths";
import RelationshipMarkers from "./defs/RelationshipMarkers";
import Entity from "./Entity";
import { SvgRenderOptions } from "./index";
import Relationship from "./Relationship";
import { LayoutedDiagram } from "../../../rendering/layouters/diagram";

export default class ClassDiagram extends React.Component<Props> {
    render() {
        const { layoutedDiagram, renderOptions } = this.props;
        const { entities, relationships, size } = layoutedDiagram;
        const { width, height } = size;

        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={height}
                fontFamily={renderOptions.fontFamily}
                fontSize="16px"
            >
                <defs>
                    <RelationshipMarkers />
                    <ClipPaths entities={entities} />
                </defs>

                <rect x="0" y="0" width={width} height={height} fill="white" />

                {relationships.map(({ relationship, path }) => (
                    <Relationship
                        key={relationship.id}
                        relationship={relationship}
                        path={path}
                        renderOptions={renderOptions}
                    />
                ))}

                {entities.map(entity => (
                    <Entity key={entity.id} entity={entity} renderOptions={renderOptions} />
                ))}
            </svg>
        );
    }
}

interface Props {
    layoutedDiagram: LayoutedDiagram;
    renderOptions: SvgRenderOptions;
}
