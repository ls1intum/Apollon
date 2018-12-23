import * as React from "react";
import { Point } from "../../core/geometry";

export default class RelationshipDragPreview extends React.Component<Props> {
    render() {
        const { connectorPosition, mousePosition } = this.props;
        const { center, outer } = connectorPosition;

        const path = [center];

        if (mousePosition !== null) {
            mousePosition.y -= window.pageYOffset;
            path.push(mousePosition);
        }

        const polylinePoints = path.map(point => `${point.x} ${point.y}`).join(",");

        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="black"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                />
            </svg>
        );
    }
}

interface Props {
    connectorPosition: { center: Point; outer: Point };
    mousePosition: Point | null;
}
