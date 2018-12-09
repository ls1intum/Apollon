import * as React from "react";
import { connect } from "react-redux";
import { withTheme } from "styled-components";
import { Styles as Theme } from "./../Theme";
import { ApollonMode, EditorMode, InteractiveElementsMode } from "./../../gui/types";
import { LayoutedRelationship as Relationship } from "./../../core/domain";
import { getMarkerIdForRelationshipKind } from "./../../rendering/renderers/svg/defs/RelationshipMarkers";
import RelationshipLabels from "./../../rendering/renderers/svg/RelationshipLabels";
import { getSvgDasharrayForRelationshipKind } from "./../../rendering/renderers/svg/RenderedRelationship";
import { ElementRepository } from './../../domain/Element';
import { UUID } from '../../domain/utils/uuid';

class LayoutedRelationship extends React.Component<Props, State> {
    state: State = {
        isMouseOver: false,
        hover: false,
        selected: false,
    };

    componentDidMount() {
        document.addEventListener('mouseup', this.onMouseUp);
    }

    componentWillUnmount() {
        document.removeEventListener('mouseup', this.onMouseUp);
    }

    private onMouseOver = (event: React.MouseEvent) => {
        this.setState({ hover: true });
      };
    
    private onMouseLeave = (event: React.MouseEvent) => {
        this.setState({ hover: false });
    };

    onMouseDown = (e: React.MouseEvent<SVGPolylineElement>) => {
        e.stopPropagation();

        switch (this.props.editorMode) {
            case EditorMode.ModelingView:
                const relationship = this.props.relationship.relationship;
                if (e.shiftKey) {
                    relationship.selected = !relationship.selected
                } else {
                    relationship.selected = true;
                }
                this.setState(
                    state => ({ selected: relationship.selected }),
                    () => this.props.update(relationship)
                );
                break;

            case EditorMode.InteractiveElementsView:
                this.props.onToggleInteractiveElements(this.props.relationship.relationship.id);
                break;
        }
    };
    
    onMouseUp = (event: MouseEvent) => {
        if (!event.shiftKey) {
            if (!this.state.hover && this.state.selected) {
                const relationship = this.props.relationship.relationship;
                relationship.selected = false
                this.props.update(relationship)
            }
            this.setState((state, props) => ({
                selected: state.hover,
            }));
        }
    }

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
                    onMouseEnter={e => {this.onMouseOver(e); this.setState({ isMouseOver: true })}}
                    onMouseLeave={e => {this.onMouseLeave(e); this.setState({ isMouseOver: false })}}
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

export default withTheme(connect(null, {
    update: ElementRepository.update,
})(LayoutedRelationship));

interface OwnProps {
    relationship: Relationship;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    theme: Theme;
    isSelected: boolean;
    onSelect: () => void;
    onToggleSelection: () => void;
    isInteractiveElement: boolean;
    interactiveElementsMode: InteractiveElementsMode;
    onToggleInteractiveElements: (...ids: UUID[]) => void;
    openDetailsPopup: () => void;
}

interface DispatchProps {
    update: typeof ElementRepository.update;
}

type Props = OwnProps & DispatchProps;

interface State {
    isMouseOver: boolean;
    hover: boolean;
    selected: boolean;
}
