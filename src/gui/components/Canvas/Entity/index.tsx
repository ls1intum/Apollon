import * as React from "react";
import {
    ConnectDragPreview,
    ConnectDragSource,
    DragSource,
    DragSourceCollector,
    DragSourceSpec
} from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled, { withTheme } from "styled-components";
import Member from "./Member";
import Name from "./Name";
import ResizeHandle from "./ResizeHandle";
import * as DragDrop from "../../dnd";
import { Theme } from "../../../theme";
import { ApollonMode, EditorMode, ElementSelection, InteractiveElementsMode } from "../../../types";
import { Entity, EntityKind } from "../../../../core/domain";
import { UUID } from "../../../../core/utils";
import {
    computeEntityHeight,
    ENTITY_MEMBER_LIST_VERTICAL_PADDING
} from "../../../../rendering/layouters/entity";

const MemberList = styled.div`
    border-top: 1px solid black;
    padding: ${ENTITY_MEMBER_LIST_VERTICAL_PADDING}px 0;
`;

class CanvasEntity extends React.Component<Props, State> {
    rootNode: HTMLDivElement | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            isMouseOverEntity: false,
            isMouseOverEntityName: false,
            entityWidth: props.entity.size.width
        };
    }

    componentDidMount() {
        this.props.connectDragPreview(getEmptyImage());
    }

    componentWillReceiveProps(newProps: Props) {
        this.setState({ entityWidth: newProps.entity.size.width });
    }

    onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        this.props.onMouseDown(e);
    };

    toggleEntityInteractiveElement = () => {
        console.log("toggleEntityInteractiveElement", this.state.isMouseOverEntityName);
        const { entity, interactiveElementIds } = this.props;

        // We don't want to react to clicks on this entity if the entity currently isn't interactive
        // and the user clicked somethere on the entity outside of the entity name area (e.g. on padding areas)
        if (!interactiveElementIds.has(entity.id) && !this.state.isMouseOverEntityName) {
            return;
        }

        const interactiveMemberIdsOfEntity = [
            ...entity.attributes.map(attr => attr.id),
            ...entity.methods.map(method => method.id)
        ].filter(id => interactiveElementIds.has(id));

        this.props.onToggleInteractiveElements(entity.id, ...interactiveMemberIdsOfEntity);
    };

    onResizeBegin = () => {
        this.props.onChangeIsResizing(true);
    };

    onResizeMove = (dx: number) => {
        this.setState({
            entityWidth: Math.max(this.props.entity.size.width + dx, 100)
        });
    };

    onResizeEnd = (dx: number) => {
        const newWidth = Math.max(this.props.entity.size.width + dx, 100);
        this.setState({ entityWidth: newWidth });
        this.props.onChangeIsResizing(false);

        if (dx !== 0) {
            this.props.updateEntityWidth(newWidth);
        }
    };

    render() {
        const {
            entity,
            connectDragSource,
            apollonMode,
            editorMode,
            interactiveElementIds
        } = this.props;

        const { attributes, methods, renderMode } = entity;

        const containerStyle = this.computeContainerStyle();

        const onMouseDown = editorMode === EditorMode.ModelingView ? this.onMouseDown : undefined;

        const onMouseUp = editorMode === EditorMode.ModelingView ? this.props.onMouseUp : undefined;

        const onClick =
            editorMode === EditorMode.InteractiveElementsView
                ? this.toggleEntityInteractiveElement
                : undefined;

        const specialElement =
            entity.kind === EntityKind.ActivityControlInitialNode ||
            entity.kind === EntityKind.ActivityControlFinalNode ||
            entity.kind === EntityKind.ActivityMergeNode ||
            entity.kind === EntityKind.ActivityForkNode ||
            entity.kind === EntityKind.ActivityForkNodeHorizontal;

        const entityDiv = (
            <div
                ref={ref => (this.rootNode = ref)}
                id={`entity-${entity.id}`}
                style={containerStyle}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onClick={onClick}
                onDoubleClick={
                    apollonMode === ApollonMode.ReadOnly || specialElement
                        ? undefined
                        : this.props.openDetailsPopup
                }
                onMouseEnter={() => {
                    this.setState({ isMouseOverEntityName: true, isMouseOverEntity: true });
                }}
                onMouseLeave={() =>
                    this.setState({ isMouseOverEntityName: false, isMouseOverEntity: false })
                }
            >
                {!specialElement && (
                    <Name
                        entity={entity}
                        onMouseEnter={() => {
                            this.setState({ isMouseOverEntityName: true });
                        }}
                        onMouseLeave={() => {
                            this.setState({ isMouseOverEntityName: false });
                        }}
                    />
                )}

                {renderMode.showAttributes && (
                    <MemberList>
                        {attributes.map(attribute => (
                            <Member
                                key={attribute.id}
                                entityId={entity.id}
                                member={attribute}
                                editorMode={editorMode}
                                interactiveElementsMode={this.props.interactiveElementsMode}
                                canBeMadeInteractive={
                                    !this.props.interactiveElementIds.has(entity.id)
                                }
                                isInteractiveElement={interactiveElementIds.has(attribute.id)}
                                onToggleInteractiveElements={() => {
                                    this.props.onToggleInteractiveElements(attribute.id);
                                }}
                            />
                        ))}
                    </MemberList>
                )}

                {renderMode.showMethods && (
                    <MemberList>
                        {methods.map(method => (
                            <Member
                                key={method.id}
                                entityId={entity.id}
                                member={method}
                                editorMode={editorMode}
                                interactiveElementsMode={this.props.interactiveElementsMode}
                                canBeMadeInteractive={
                                    !this.props.interactiveElementIds.has(entity.id)
                                }
                                isInteractiveElement={interactiveElementIds.has(method.id)}
                                onToggleInteractiveElements={() => {
                                    this.props.onToggleInteractiveElements(method.id);
                                }}
                            />
                        ))}
                    </MemberList>
                )}

                {apollonMode !== ApollonMode.ReadOnly &&
                    !specialElement && (
                        <ResizeHandle
                            initialWidth={entity.size.width}
                            gridSize={this.props.gridSize}
                            onResizeBegin={this.onResizeBegin}
                            onResizeMove={this.onResizeMove}
                            onResizeEnd={this.onResizeEnd}
                        />
                    )}

                {specialElement && this.computeChild()}
            </div>
        );

        return editorMode === EditorMode.ModelingView ? connectDragSource(entityDiv) : entityDiv;
    }

    computeContainerStyle(): React.CSSProperties {
        const {
            entity,
            apollonMode,
            editorMode,
            isDragging,
            interactiveElementIds,
            interactiveElementsMode
        } = this.props;

        const isInteractiveElement = interactiveElementIds.has(entity.id);

        const visibility =
            isInteractiveElement && interactiveElementsMode === InteractiveElementsMode.Hidden
                ? "hidden"
                : undefined;

        const hasContainer =
            entity.kind !== EntityKind.ActivityControlInitialNode &&
            entity.kind !== EntityKind.ActivityControlFinalNode &&
            entity.kind !== EntityKind.ActivityMergeNode &&
            entity.kind !== EntityKind.ActivityForkNode;

        const baseProperties: React.CSSProperties = {
            position: "absolute",
            left: entity.position.x,
            top: entity.position.y,
            width: this.state.entityWidth,
            height: computeEntityHeight(
                entity.kind,
                entity.attributes.length,
                entity.methods.length,
                entity.renderMode
            ),
            visibility,
            opacity: isDragging ? 0.35 : 1,
            cursor:
                apollonMode !== ApollonMode.ReadOnly && editorMode === EditorMode.ModelingView
                    ? "move"
                    : "default",
            zIndex: 8000
        };

        if (!hasContainer) {
            return baseProperties;
        }
        return {
            ...baseProperties,
            borderRadius: entity.kind == EntityKind.ActivityActionNode ? 10 : 0,
            border: "1px solid black",
            backgroundColor: "white",
            backgroundImage: this.computeContainerBackgroundImage(isInteractiveElement),
            boxShadow: this.computeContainerBoxShadow()
        };
    }

    computeContainerBackgroundImage(isInteractiveElement: boolean) {
        const { editorMode, theme } = this.props;
        const { isMouseOverEntity, isMouseOverEntityName } = this.state;

        let backgroundColor: string | null = null;

        if (editorMode === EditorMode.InteractiveElementsView) {
            if (isInteractiveElement) {
                backgroundColor = isMouseOverEntity
                    ? theme.interactiveAreaHoverColor
                    : theme.interactiveAreaColor;
            } else if (isMouseOverEntityName) {
                backgroundColor = theme.interactiveAreaHoverColor;
            }
        }

        return backgroundColor === null
            ? "none"
            : `linear-gradient(${backgroundColor}, ${backgroundColor})`;
    }

    computeContainerBoxShadow() {
        const { entity, isDragging, selection, theme, editorMode } = this.props;
        const { isMouseOverEntity } = this.state;

        const isSelected = selection.entityIds.includes(entity.id);

        switch (editorMode) {
            case EditorMode.ModelingView:
                return isMouseOverEntity || isSelected || isDragging
                    ? `0 0 0 4px ${theme.highlightColor}`
                    : "none";

            default:
                return "none";
        }
    }

    computeChild() {
        const {
            entity,
            apollonMode,
            editorMode,
            isDragging,
            interactiveElementIds,
            interactiveElementsMode
        } = this.props;

        const color =
            editorMode === EditorMode.InteractiveElementsView &&
            interactiveElementIds.has(entity.id)
                ? "rgba(0, 220, 0, 0.3)"
                : "black";

        if (entity.kind === EntityKind.ActivityControlInitialNode) {
            return (
                <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                    <circle cx="50" cy="50" r="50" fill={color} />
                </svg>
            );
        }
        if (entity.kind === EntityKind.ActivityControlFinalNode) {
            return (
                <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                    <circle
                        cx="50"
                        cy="50"
                        r="49"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="2"
                    />
                    <circle cx="50" cy="50" r="40" fill={color} />
                </svg>
            );
        }
        if (entity.kind === EntityKind.ActivityMergeNode) {
            return (
                <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                    <polyline
                        points="50 0, 100 50, 50 100, 0 50, 50 0"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="2"
                    />
                </svg>
            );
        }
        if (
            entity.kind === EntityKind.ActivityForkNode ||
            entity.kind === EntityKind.ActivityForkNodeHorizontal
        ) {
            return (
                <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="100" fill={color} />
                </svg>
            );
        }
    }
}

interface OwnProps {
    entity: Entity;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    interactiveElementsMode: InteractiveElementsMode;
    selection: ElementSelection;
    gridSize: number;
    updateEntityWidth: (newWidth: number) => void;
    openDetailsPopup: () => void;
    onChangeIsResizing: (isResizing: boolean) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onStartDragging: () => void;
    onEndDragging: () => void;
    interactiveElementIds: ReadonlySet<UUID>;
    onToggleInteractiveElements: (...ids: UUID[]) => void;
}

interface DragDropProps {
    connectDragPreview: ConnectDragPreview;
    connectDragSource: ConnectDragSource;
    isDragging: boolean;
}

interface ThemeProps {
    theme: Theme;
}

type Props = OwnProps & DragDropProps & ThemeProps;

interface State {
    isMouseOverEntity: boolean;
    isMouseOverEntityName: boolean;
    entityWidth: number;
}

const dragSourceSpec: DragSourceSpec<OwnProps> = {
    canDrag(props) {
        return props.apollonMode !== ApollonMode.ReadOnly;
    },
    beginDrag(props, monitor, component): DragDrop.DragItem {
        props.onStartDragging();

        const rootNode = (component as CanvasEntity).rootNode!;
        const { width, height } = rootNode.getBoundingClientRect();

        return {
            type: DragDrop.ItemTypes.ExistingEntities,
            entityIds: props.selection.entityIds,
            size: { width, height }
        };
    },
    endDrag(props) {
        props.onEndDragging();
    }
};

const dragSourceCollector: DragSourceCollector = (connector, monitor): DragDropProps => ({
    connectDragPreview: connector.dragPreview(),
    connectDragSource: connector.dragSource(),
    isDragging: monitor.isDragging()
});

export default (withTheme(DragSource(
    DragDrop.ItemTypes.ExistingEntities,
    dragSourceSpec,
    dragSourceCollector
)(CanvasEntity as any) as any) as any) as React.ComponentClass<OwnProps>;
