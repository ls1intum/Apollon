import * as React from "react";
import { withTheme } from "styled-components";
import { Theme } from "../../../theme";
import { ApollonMode, EditorMode, InteractiveElementsMode } from "../../../types";
import { LayoutedRelationship } from "../../../../core/domain";
import { getMarkerIdForRelationshipKind } from "../../../../rendering/renderers/svg/defs/RelationshipMarkers";
import RelationshipLabels from "../../../../rendering/renderers/svg/RelationshipLabels";
import { getSvgDasharrayForRelationshipKind } from "../../../../rendering/renderers/svg/RenderedRelationship";

class Relationship extends React.Component<Props, State> {
    state: State = {
        isMouseOver: false
    };

    onMouseDown = (e: React.MouseEvent<SVGPolylineElement>) => {
        e.stopPropagation();

        switch (this.props.editorMode) {
            case EditorMode.ModelingView:
                if (e.shiftKey) {
                    this.props.onToggleSelection();
                } else if (!this.props.isSelected) {
                    this.props.onSelect();
                }
                break;

            case EditorMode.InteractiveElementsView:
                this.props.onToggleInteractiveElements();
                break;
        }
    };

    render() {
        const { apollonMode, isInteractiveElement, interactiveElementsMode } = this.props;

        const visibility =
            isInteractiveElement && interactiveElementsMode === InteractiveElementsMode.Hidden
                ? "hidden"
                : undefined;

        const { relationship, path } = this.props.relationship;

        const polylinePoints = path.map(point => `${point.x} ${point.y}`).join(",");

        const markerId = getMarkerIdForRelationshipKind(relationship.kind);
        const markerEnd = markerId === null ? undefined : `url(#${markerId})`;

        const outlineStroke = this.computeOutlineStroke();
        const strokeDasharray = getSvgDasharrayForRelationshipKind(relationship.kind);

        const onDoubleClick =
            apollonMode === ApollonMode.ReadOnly ? undefined : this.props.openDetailsPopup;

        return (
            <>
                <RelationshipLabels relationship={relationship} relationshipPath={path} />
                <polyline
                    points={polylinePoints}
                    strokeWidth="15"
                    stroke={outlineStroke}
                    fill="none"
                    onMouseDown={this.onMouseDown}
                    onMouseEnter={() => this.setState({ isMouseOver: true })}
                    onMouseLeave={() => this.setState({ isMouseOver: false })}
                    onDoubleClick={onDoubleClick}
                    style={{ visibility }}
                />
                <polyline
                    points={polylinePoints}
                    strokeWidth="1"
                    stroke="black"
                    strokeDasharray={strokeDasharray}
                    fill="none"
                    markerEnd={markerEnd}
                    pointerEvents="none"
                    style={{ visibility }}
                />
            </>
        );
    }

    computeOutlineStroke() {
        const { editorMode, theme, isSelected, isInteractiveElement } = this.props;
        const { isMouseOver } = this.state;

        if (editorMode === EditorMode.InteractiveElementsView) {
            if (isMouseOver) {
                return theme.interactiveAreaHoverColor;
            }

            if (isInteractiveElement) {
                return theme.interactiveAreaColor;
            }

            return "transparent";
        }

        return isMouseOver || isSelected ? theme.highlightColor : "transparent";
    }
}

export default withTheme(Relationship);

interface Props {
    relationship: LayoutedRelationship;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    theme: Theme;
    isSelected: boolean;
    onSelect: () => void;
    onToggleSelection: () => void;
    isInteractiveElement: boolean;
    interactiveElementsMode: InteractiveElementsMode;
    onToggleInteractiveElements: () => void;
    openDetailsPopup: () => void;
}

interface State {
    isMouseOver: boolean;
}
