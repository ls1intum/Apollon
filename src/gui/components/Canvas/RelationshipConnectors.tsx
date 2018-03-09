import * as React from "react";
import { connect } from "react-redux";
import styled from "styled-components";
import RelationshipDragPreview from "./RelationshipDragPreview";
import { createRelationship, getAllEntities, ReduxState } from "../../redux";
import { Point, RectEdge } from "../../../geometry";
import { EditorMode, ElementSelection, Entity, RelationshipKind } from "../../../uml";
import { UUID } from "../../../uuid";

const connectorSize = 40;
const connectorRadius = connectorSize / 2;

const StyledConnector: any = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    cursor: crosshair;
    user-select: none;
    background: ${(props: any) =>
        props.isSelected ? props.theme.highlightColorDarker : props.theme.highlightColor};

    &:hover {
        background: ${(props: any) => props.theme.highlightColorDarker};
    }
`;

class RelationshipConnectors extends React.Component<Props, State> {
    state: State = {
        mousePosition: null,
        startConnector: null
    };

    onWindowMouseUp = () => {
        window.setTimeout(this.clearStartConnector, 0);
    };

    onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const containerClientRect = e.currentTarget.getBoundingClientRect();
        this.setState({
            mousePosition: {
                x: e.pageX - containerClientRect.left,
                y: e.pageY - containerClientRect.top
            }
        });
    };

    clearStartConnector = () => {
        this.setState(state => {
            if (state.startConnector === null) {
                // No state update necessary
                return null as any;
            }

            return { startConnector: null };
        });
    };

    componentWillUnmount() {
        window.removeEventListener("mouseup", this.clearStartConnector);
    }

    render() {
        const { entities } = this.props;
        const { startConnector } = this.state;

        const containerStyle: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: startConnector === null ? "none" : "auto"
        };

        const onMouseMove = startConnector === null ? undefined : this.onMouseMove;

        return (
            <div style={containerStyle} onMouseMoveCapture={onMouseMove}>
                {entities.map(entity => {
                    const connectorPositions = computeConnectorPositions(entity);
                    const [opacity, pointerEvents] = this.showEntityConnectors(entity)
                        ? [1, "auto"]
                        : [0, "none"];

                    return connectorPositions.map(connector => {
                        const connectorStyle: React.CSSProperties = {
                            position: "absolute",
                            width: connectorSize,
                            height: connectorSize,
                            left: connector.center.x - connectorRadius,
                            top: connector.center.y - connectorRadius,
                            borderRadius: connectorRadius,
                            overflow: "hidden",
                            transition: "opacity 100ms ease-in-out",
                            opacity,
                            pointerEvents
                        };

                        return (
                            <div
                                key={`${entity.id}__connector-${connector.rectEdge}`}
                                style={connectorStyle}
                                onMouseDown={e => {
                                    e.stopPropagation();

                                    window.removeEventListener("mouseup", this.onWindowMouseUp);
                                    window.addEventListener("mouseup", this.onWindowMouseUp, {
                                        once: true,
                                        passive: true
                                    });

                                    const containerClientRect = e.currentTarget
                                        .parentElement!.getBoundingClientRect();

                                    this.setState({
                                        startConnector: [entity, connector],
                                        mousePosition: {
                                            x: e.pageX - containerClientRect.left,
                                            y: e.pageY - containerClientRect.top
                                        }
                                    });
                                }}
                                onMouseUp={e => {
                                    if (startConnector === null) {
                                        // Shouldn't happen
                                        return;
                                    }

                                    const [sourceEntity] = startConnector;
                                    const sourceEdge = startConnector[1].rectEdge;

                                    if (
                                        sourceEntity.id === entity.id &&
                                        sourceEdge === connector.rectEdge
                                    ) {
                                        return;
                                    }

                                    this.setState({ startConnector: null });

                                    const action = this.props.createRelationship(
                                        RelationshipKind.AssociationBidirectional,
                                        {
                                            entityId: sourceEntity.id,
                                            multiplicity: null,
                                            role: null,
                                            edge: sourceEdge,
                                            edgeOffset: 0.5
                                        },
                                        {
                                            entityId: entity.id,
                                            multiplicity: null,
                                            role: null,
                                            edge: connector.rectEdge,
                                            edgeOffset: 0.5
                                        }
                                    );

                                    this.props.selectRelationship((action as any).relationship.id);
                                }}
                            >
                                <StyledConnector
                                    isSelected={
                                        startConnector !== null &&
                                        startConnector[0].id === entity.id &&
                                        startConnector[1].rectEdge === connector.rectEdge
                                    }
                                />
                            </div>
                        );
                    });
                })}

                {startConnector !== null && (
                    <RelationshipDragPreview
                        connectorPosition={startConnector[1]}
                        mousePosition={this.state.mousePosition}
                    />
                )}
            </div>
        );
    }

    showEntityConnectors(entity: Entity): boolean {
        if (!this.props.showConnectors) {
            return false;
        }

        if (this.props.editorMode !== EditorMode.ModelingView) {
            return false;
        }

        const { entityIds, relationshipIds } = this.props.selection;

        if (entityIds.length !== 1 || relationshipIds.length !== 0) {
            // We only ever want to show relationship connectors
            // if the user selects exactly one entity and no relationship
            return false;
        }

        if (entity.id === entityIds[0]) {
            // If we made it to this point, we definitely want to show
            // relationship connectors for the currently selected entity
            return true;
        }

        // Only show relationship connectors of other entities if the user
        // has started dragging from one of the selected entity's connectors
        return this.state.startConnector !== null;
    }
}

interface Connector {
    rectEdge: RectEdge;
    center: Point;
    outer: Point;
}

function computeConnectorPositions(entity: Entity): Connector[] {
    const { width, height } = entity.size;
    const { x, y } = entity.position;

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return [
        {
            rectEdge: "TOP",
            center: { x: centerX, y },
            outer: { x: centerX, y: y - connectorRadius }
        },
        {
            rectEdge: "RIGHT",
            center: { x: x + width, y: centerY },
            outer: { x: x + width + connectorRadius, y: centerY }
        },
        {
            rectEdge: "BOTTOM",
            center: { x: centerX, y: y + height },
            outer: { x: centerX, y: y + height + connectorRadius }
        },
        {
            rectEdge: "LEFT",
            center: { x, y: centerY },
            outer: { x: x - connectorRadius, y: centerY }
        }
    ];
}

interface OwnProps {
    editorMode: EditorMode;
    selection: ElementSelection;
    selectRelationship: (relationshipId: UUID) => void;
    showConnectors: boolean;
}

interface StateProps {
    entities: Entity[];
}

interface DispatchProps {
    createRelationship: typeof createRelationship;
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
    mousePosition: Point | null;
    startConnector: [Entity, Connector] | null;
}

function mapStateToProps(state: ReduxState): StateProps {
    return {
        entities: getAllEntities(state)
    };
}

export default connect(mapStateToProps, { createRelationship })(RelationshipConnectors);
