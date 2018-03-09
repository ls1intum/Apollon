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
import { EditorMode, ElementSelection, InteractiveElementsMode } from "../../../types";
import { Entity } from "../../../../core/domain";
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
        const { entity, connectDragSource, editorMode, interactiveElementIds } = this.props;
        const { attributes, methods, renderMode } = entity;

        const containerStyle = this.computeContainerStyle();

        const onMouseDown = editorMode === EditorMode.ModelingView ? this.onMouseDown : undefined;

        const onMouseUp = editorMode === EditorMode.ModelingView ? this.props.onMouseUp : undefined;

        const onClick =
            editorMode === EditorMode.InteractiveElementsView
                ? this.toggleEntityInteractiveElement
                : undefined;

        const entityDiv = (
            <div
                ref={ref => (this.rootNode = ref)}
                id={`entity-${entity.id}`}
                style={containerStyle}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onClick={onClick}
                onDoubleClick={this.props.openDetailsPopup}
                onMouseEnter={() => this.setState({ isMouseOverEntity: true })}
                onMouseLeave={() => this.setState({ isMouseOverEntity: false })}
            >
                <Name
                    entity={entity}
                    onMouseEnter={() => {
                        this.setState({ isMouseOverEntityName: true });
                    }}
                    onMouseLeave={() => {
                        this.setState({ isMouseOverEntityName: false });
                    }}
                />

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

                <ResizeHandle
                    initialWidth={entity.size.width}
                    gridSize={this.props.gridSize}
                    onResizeBegin={this.onResizeBegin}
                    onResizeMove={this.onResizeMove}
                    onResizeEnd={this.onResizeEnd}
                />
            </div>
        );

        return editorMode === EditorMode.ModelingView ? connectDragSource(entityDiv) : entityDiv;
    }

    computeContainerStyle(): React.CSSProperties {
        const {
            entity,
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

        return {
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
            border: "1px solid black",
            visibility,
            opacity: isDragging ? 0.35 : 1,
            cursor: editorMode === EditorMode.ModelingView ? "move" : "default",
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
}

interface OwnProps {
    entity: Entity;
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
