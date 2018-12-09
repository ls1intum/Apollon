import * as React from "react";
import { connect } from "react-redux";
import styled from "styled-components";
import CanvasContainer from "./../../components/Canvas/Container";
import DragLayer from "./DragLayer";
// import Sidebar from "./Sidebar";
import { ZIndices } from "./zindices";
import { getAllEntities, getAllRelationships } from "../redux/selectors";
import { State as ReduxState } from "./../../components/Store";
import { ApollonMode, DiagramType, EditorMode, ElementSelection, InteractiveElementsMode } from "../types";
import { Entity, Relationship, UMLModel } from "../../core/domain";
import { UUID } from "../../core/utils";
import { computeDiagramBoundingBox, computeRelationshipPaths } from "../../rendering/layouters/diagram";

const SIDEBAR_WIDTH = 260;

const FlexContainer = styled.div`
    width: 100%;
    height: 100%;
    font-family: ${props => props.theme.fontFamily};
    display: flex;
    overflow: hidden;
    position: relative;
`;

// const SidebarFlexItem = styled.div`
//     width: ${SIDEBAR_WIDTH}px;
// `;

const CanvasFlexItem = styled.div`
    position: relative;
    overflow: scroll;
`;

const OverlayDropShadow = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    pointer-events: none;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
    border: 1px solid ${props => props.theme.borderColor};
    z-index: ${ZIndices.CanvasInnerDropShadowLayer};
`;

class Editor extends React.Component<Props, State> {
    canvas: HTMLDivElement | null = null;
    canvasScrollContainer: HTMLDivElement | null = null;

    state: State = {
        didScroll: false,
        // editorMode: EditorMode.ModelingView,
        // interactiveElementsMode: InteractiveElementsMode.Highlighted
    };

    selectEditorMode = (newMode: EditorMode) => {
        // this.setState({ editorMode: newMode });
    };

    selectInteractiveElementsMode = (newMode: InteractiveElementsMode) => {
        // this.setState({ interactiveElementsMode: newMode });
    };

    componentDidMount() {
        this.scrollDiagramIntoView();
    }

    scrollDiagramIntoView() {
        if (this.canvasScrollContainer !== null) {
            const {
                clientWidth,
                clientHeight,
                scrollWidth,
                scrollHeight
            } = this.canvasScrollContainer;

            const diagram: UMLModel = this.props;

            if (diagram.entities.length === 0) {
                const left = Math.abs(scrollWidth - clientWidth) / 2;
                const top = Math.abs(scrollHeight - clientHeight) / 2;
                if (typeof this.canvasScrollContainer.scrollTo !== "undefined") {
                    this.canvasScrollContainer.scrollTo({ left, top });
                } else {
                    this.canvasScrollContainer.scrollLeft = left;
                    this.canvasScrollContainer.scrollTop = top;
                }
            } else {
                const relationshipPaths = computeRelationshipPaths(diagram);
                const boundingBox = computeDiagramBoundingBox(diagram, relationshipPaths);

                const PADDING_AROUND_DIAGRAM = 50;

                const left = Math.min(
                    boundingBox.x - (clientWidth - boundingBox.width) / 2,
                    boundingBox.x - PADDING_AROUND_DIAGRAM
                );

                const top = Math.min(
                    boundingBox.y - (clientHeight - boundingBox.height) / 2,
                    boundingBox.y - PADDING_AROUND_DIAGRAM
                );

                if (typeof this.canvasScrollContainer.scrollTo !== "undefined") {
                    this.canvasScrollContainer.scrollTo({ left, top });
                } else {
                    this.canvasScrollContainer.scrollLeft = left;
                    this.canvasScrollContainer.scrollTop = top;
                }
            }

            window.setTimeout(() => {
                this.setState({ didScroll: true });
            }, 0);
        }
    }

    render() {
        const { apollonMode, entities, relationships, selection } = this.props;
        const { entityIds, relationshipIds } = selection;

        const selectedEntities = entities.filter(entity => entityIds.includes(entity.id));
        const selectedRelationships = relationships.filter(rel => relationshipIds.includes(rel.id));

        const canvasFlexItemWidth =
            apollonMode === ApollonMode.ReadOnly ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`;

        return (
            <FlexContainer>
                <CanvasFlexItem
                    ref={(ref: any) => (this.canvasScrollContainer = ref)}
                    style={{
                        overflow: this.state.didScroll ? "scroll" : "hidden",
                        width: "100%",
                        lineHeight: 1
                    }}
                >
                    <CanvasContainer
                        innerRef={ref => (this.canvas = ref)}
                        diagramType={this.props.diagramType}
                        apollonMode={apollonMode}
                        editorMode={this.props.editorMode}
                        interactiveElementsMode={this.props.interactiveElementsMode}
                        selection={this.props.selection}
                        canvasScrollContainer={this.canvasScrollContainer}
                    />
                </CanvasFlexItem>

                <DragLayer
                    canvas={this.canvas!}
                    canvasScrollContainer={this.canvasScrollContainer!}
                />

                <OverlayDropShadow
                    style={{ right: 0 }}
                />
            </FlexContainer>
        );
    }
}

interface OwnProps {
    selection: ElementSelection;
}

interface StateProps {
    entities: Entity[];
    relationships: Relationship[];
    diagramType: DiagramType;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    interactiveElementsMode: InteractiveElementsMode;
    debugModeEnabled: boolean;
}

type Props = OwnProps & StateProps;

interface State {
    didScroll: boolean;
}

function mapStateToProps(state: ReduxState): StateProps {
    return {
        entities: getAllEntities(state),
        relationships: getAllRelationships(state),
        diagramType: state.options.diagramType,
        apollonMode: state.options.mode,
        editorMode: state.options.editorMode,
        interactiveElementsMode: state.options.interactiveMode,
        debugModeEnabled: state.options.debug,
    };
}

export default connect(mapStateToProps)(Editor);
