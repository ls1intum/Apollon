import * as React from "react";
import { connect } from "react-redux";
import { withTheme } from "styled-components";
import { Theme } from "./../../../gui/theme";
import { ApollonMode, EditorMode, InteractiveElementsMode } from "./../../../gui/types";
import { LayoutedRelationship } from "./../../../core/domain";
import { getMarkerIdForRelationshipKind } from "./../../../rendering/renderers/svg/defs/RelationshipMarkers";
import RelationshipLabels from "./../../../rendering/renderers/svg/RelationshipLabels";
import { getSvgDasharrayForRelationshipKind } from "./../../../rendering/renderers/svg/RenderedRelationship";
import { ElementRepository } from './../../../domain/Element';

class Relationship extends React.Component<Props, State> {
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
                this.setState(
                    state => ({ selected: !this.state.selected }),
                    () => this.state.selected ? this.props.select(this.props.relationship.relationship) : this.props.deselect(this.props.relationship.relationship)
                );
                break;

            case EditorMode.InteractiveElementsView:
                this.props.onToggleInteractiveElements();
                break;
        }
    };
    
    onMouseUp = (event: MouseEvent) => {
        if (!event.shiftKey) {
            if (!this.state.hover && this.state.selected) {
                this.props.deselect(this.props.relationship.relationship)
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
    select: ElementRepository.select,
    deselect: ElementRepository.deselect,
})(Relationship));

interface OwnProps {
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

interface DispatchProps {
    select: typeof ElementRepository.select;
    deselect: typeof ElementRepository.deselect;
}

type Props = OwnProps & DispatchProps;

interface State {
    isMouseOver: boolean;
    hover: boolean;
    selected: boolean;
}
