import * as React from "react";
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from "react-dnd";
import { connect } from "react-redux";
import styled from "styled-components";
import Entity from "./Entity";
import Grid from "./Grid";
import EntityDetailsPopup from "./Popups/EntityDetailsPopup";
import RelationshipDetailsPopup from "./Popups/RelationshipDetailsPopup";
import RelationshipConnectors from "./RelationshipConnectors";
import Relationships from "./Relationships";
import * as DragDrop from "../dnd";
import { ZIndices } from "../zindices";
import {
    createEntity,
    getAllEntities,
    getAllInteractiveElementIds,
    getAllLayoutedRelationships,
    moveEntities,
    ReduxState,
    toggleInteractiveElements,
    updateEntityWidth
} from "../../redux";
import { Size, snapPointToGrid } from "../../../geometry";
import * as UML from "../../../uml";
import { UUID } from "../../../uuid";

const StyledCanvas = styled.div`
    width: ${(props: any) => props.width}px;
    height: ${(props: any) => props.height}px;
    position: relative;
` as any;

const GridLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${ZIndices.GridLayer};
`;

const CanvasObjectsLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${ZIndices.CanvasObjectsLayer};
`;

class Canvas extends React.Component<Props, State> {
    canvas: HTMLDivElement | null = null;

    state: State = {
        doubleClickedElement: { type: "none" },
        userIsHoldingEntity: false,
        userIsResizingEntity: false
    };

    selectEntity = (entityId: UUID, e: React.MouseEvent<HTMLDivElement>) => {
        this.onStartHoldEntity();
        if (e.shiftKey) {
            this.props.toggleEntitySelection(entityId);
        } else if (!this.props.selection.entityIds.includes(entityId)) {
            this.props.selectEntity(entityId);
        }
    };

    selectRelationship = (relationshipId: UUID) => {
        if (!this.props.selection.relationshipIds.includes(relationshipId)) {
            this.props.selectRelationship(relationshipId);
        }
    };

    toggleRelationshipSelection = (relationshipId: UUID) => {
        this.props.toggleRelationshipSelection(relationshipId);
    };

    onStartHoldEntity = () => this.setState({ userIsHoldingEntity: true });
    onStopHoldEntity = () => this.setState({ userIsHoldingEntity: false });

    render() {
        const {
            canvasSize,
            gridSize,
            entities,
            relationships,
            connectDropTarget,
            editorMode,
            interactiveElementsRenderMode
        } = this.props;

        const { selection } = this.props;

        const canvasStyles: React.CSSProperties = {
            width: canvasSize.width,
            height: canvasSize.height,
            position: "relative",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
        };

        return connectDropTarget(
            <div
                ref={ref => {
                    this.canvas = ref;
                    this.props.innerRef(ref);
                }}
                style={canvasStyles}
                onMouseDown={() => {
                    const { entityIds, relationshipIds } = selection;
                    if (entityIds.length + relationshipIds.length > 0) {
                        this.props.unselectAllElements();
                    }
                }}
            >
                <StyledCanvas width={canvasSize.width} height={canvasSize.height}>
                    <GridLayer>
                        <Grid gridSize={gridSize} />
                    </GridLayer>

                    <CanvasObjectsLayer>
                        <Relationships
                            relationships={relationships}
                            canvasSize={canvasSize}
                            selection={selection}
                            onSelectRelationship={this.selectRelationship}
                            onToggleRelationshipSelection={this.toggleRelationshipSelection}
                            openDetailsPopup={(relationshipId: UUID) => {
                                this.setState({
                                    doubleClickedElement: {
                                        type: "relationship",
                                        relationshipId
                                    }
                                });
                            }}
                            editorMode={editorMode}
                            interactiveElementIds={this.props.interactiveElementIds}
                            interactiveElementsMode={interactiveElementsRenderMode}
                            onToggleInteractiveElements={this.props.toggleInteractiveElements}
                        />

                        <RelationshipConnectors
                            editorMode={editorMode}
                            selection={selection}
                            selectRelationship={this.props.selectRelationship}
                            showConnectors={
                                this.state.doubleClickedElement.type === "none" &&
                                !this.state.userIsHoldingEntity &&
                                !this.state.userIsResizingEntity
                            }
                        />

                        {entities.map(entity => (
                            <Entity
                                key={entity.id}
                                entity={entity}
                                editorMode={editorMode}
                                selection={selection}
                                gridSize={gridSize}
                                updateEntityWidth={newWidth =>
                                    this.props.updateEntityWidth(entity.id, newWidth)
                                }
                                openDetailsPopup={() => {
                                    this.setState({
                                        doubleClickedElement: {
                                            type: "entity",
                                            entityId: entity.id
                                        }
                                    });
                                }}
                                onChangeIsResizing={isResizing =>
                                    this.setState({ userIsResizingEntity: isResizing })
                                }
                                onMouseDown={e => this.selectEntity(entity.id, e)}
                                onMouseUp={this.onStopHoldEntity}
                                onStartDragging={this.onStartHoldEntity}
                                onEndDragging={this.onStopHoldEntity}
                                interactiveElementIds={this.props.interactiveElementIds}
                                interactiveElementsMode={interactiveElementsRenderMode}
                                onToggleInteractiveElements={this.props.toggleInteractiveElements}
                            />
                        ))}

                        {this.renderDetailsPopup()}
                    </CanvasObjectsLayer>
                </StyledCanvas>
            </div>
        );
    }

    renderDetailsPopup() {
        const { doubleClickedElement } = this.state;

        switch (doubleClickedElement.type) {
            case "entity": {
                const doubleClickedEntity = this.props.entities.find(
                    entity => entity.id === doubleClickedElement.entityId
                );

                return doubleClickedEntity ? (
                    <EntityDetailsPopup
                        entity={doubleClickedEntity}
                        onRequestClose={() => {
                            this.setState({ doubleClickedElement: { type: "none" } });
                        }}
                    />
                ) : null;
            }

            case "relationship": {
                const doubleClickedRelationship = this.props.relationships.find(
                    rel => rel.relationship.id === doubleClickedElement.relationshipId
                );

                return (
                    doubleClickedRelationship && (
                        <RelationshipDetailsPopup
                            relationship={doubleClickedRelationship}
                            onRequestClose={() => {
                                this.setState({ doubleClickedElement: { type: "none" } });
                            }}
                        />
                    )
                );
            }

            default:
                return null;
        }
    }
}

interface OwnProps {
    innerRef: (canvas: HTMLDivElement | null) => void;
    editorMode: UML.EditorMode;
    interactiveElementsRenderMode: UML.InteractiveElementsMode;
    selection: UML.ElementSelection;
    selectEntity: (entityId: UUID) => void;
    selectRelationship: (relationshipId: UUID) => void;
    toggleEntitySelection: (entityId: UUID) => void;
    toggleRelationshipSelection: (relationshipId: UUID) => void;
    unselectAllElements: () => void;
}

interface StateProps {
    entities: UML.Entity[];
    relationships: UML.LayoutedRelationship[];
    canvasSize: Size;
    gridSize: number;
    interactiveElementIds: ReadonlySet<UUID>;
}

interface DispatchProps {
    moveEntities: typeof moveEntities;
    createEntity: typeof createEntity;
    updateEntityWidth: typeof updateEntityWidth;
    toggleInteractiveElements: typeof toggleInteractiveElements;
}

interface DragDropProps {
    connectDropTarget: ConnectDropTarget;
}

type Props = OwnProps & StateProps & DispatchProps & DragDropProps;

interface State {
    doubleClickedElement:
        | { type: "entity"; entityId: UUID }
        | { type: "relationship"; relationshipId: UUID }
        | { type: "none" };
    userIsHoldingEntity: boolean;
    userIsResizingEntity: boolean;
}

function mapStateToProps(state: ReduxState): StateProps {
    return {
        entities: getAllEntities(state),
        relationships: getAllLayoutedRelationships(state),
        canvasSize: state.editor.canvasSize,
        gridSize: state.editor.gridSize,
        interactiveElementIds: getAllInteractiveElementIds(state)
    };
}

const dropTargetSpec: DropTargetSpec<Props> = {
    drop(props, monitor, component) {
        if (monitor === undefined || component === undefined) {
            // Should never happen, but let's be defensive
            return;
        }

        const { canvas } = component as Canvas;

        if (canvas === null) {
            // Should never happen, but let's be defensive
            return;
        }

        const item = monitor.getItem() as DragDrop.DragItem;

        if (item.type === DragDrop.ItemTypes.NewEntity) {
            const { x, y } = monitor.getSourceClientOffset();
            const canvasRect = canvas.getBoundingClientRect();
            const positionOnCanvas = {
                x: x - canvasRect.left,
                y: y - canvasRect.top
            };
            const actualPosition = snapPointToGrid(positionOnCanvas, props.gridSize);
            props.createEntity(actualPosition, item.kind);
        } else if (item.type === DragDrop.ItemTypes.ExistingEntities) {
            const snappedDifference = snapPointToGrid(
                monitor.getDifferenceFromInitialOffset(),
                props.gridSize
            );

            const delta = { dx: snappedDifference.x, dy: snappedDifference.y };

            if (delta.dx !== 0 || delta.dy !== 0) {
                props.moveEntities(item.entityIds, delta);
            }
        }
    }
};

const dropTargetCollector: DropTargetCollector = connector => ({
    connectDropTarget: connector.dropTarget()
});

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(mapStateToProps, {
    createEntity,
    moveEntities,
    updateEntityWidth,
    toggleInteractiveElements
})(DropTarget(
    [DragDrop.ItemTypes.NewEntity, DragDrop.ItemTypes.ExistingEntities],
    dropTargetSpec,
    dropTargetCollector
)(Canvas) as any);
