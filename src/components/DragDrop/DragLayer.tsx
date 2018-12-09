import * as React from "react";
import { DragLayer as DndDragLayer, DragLayerCollector, XYCoord } from "react-dnd";
import * as ReactDOM from "react-dom";
import { connect } from "react-redux";
import styled from "styled-components";
import * as DragDrop from "./dnd";
import { getAllEntities } from "./../../gui/redux/selectors";
import { ReduxState } from "./../../gui/redux/state";
import { Entity } from "../../core/domain";
import { Rect, Size, snapPointToGrid } from "../../core/geometry";

const LayerBase = styled.div`
    position: fixed;
    pointer-events: none;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
`;

const AbsoluteDragItemLayer = styled.div`
    position: absolute;
    pointer-events: none;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 4;
`;

const FixedDragItemLayer = styled(LayerBase)`
    z-index: 4;
`;

class DragLayer extends React.Component<Props> {
    render() {
        const { dragItem, dragItemOffsets } = this.props;

        if (dragItem === null || dragItemOffsets === null) {
            return null;
        }

        switch (dragItem.type) {
            case DragDrop.ItemTypes.NewEntity:
                return this.renderNewEntityDragPreview(dragItem, dragItemOffsets);

            case DragDrop.ItemTypes.ExistingEntities:
                return this.renderExistingEntitiesDragPreviews(dragItem, dragItemOffsets);

            default:
                return null;
        }
    }

    renderNewEntityDragPreview(dragItem: DragDrop.NewEntityDragItem, offsets: DragItemOffsets) {
        const [dx, dy] = [0, 0];

        // Translate the item position so that it's relative to the canvas origin
        const clientOffsetXYCoord = offsets.sourceClientOffset;
        if (clientOffsetXYCoord != null) {
            const relativePositionOnCanvas = {
                x: clientOffsetXYCoord.x + dx,
                y: clientOffsetXYCoord.y + dy
            };

            // Snap the item to the grid
            const snappedRelativePositionOnCanvas = snapPointToGrid(
                relativePositionOnCanvas,
                this.props.gridSize
            );

            // Translate the item back to its position on the drag layer
            const position = {
                x: snappedRelativePositionOnCanvas.x - dx,
                y: snappedRelativePositionOnCanvas.y - dy
            };

            return (
                <FixedDragItemLayer>
                    {this.renderDashedPreviewRectangles({ ...position, ...dragItem.size })}
                </FixedDragItemLayer>
            );

        }
    }

    renderExistingEntitiesDragPreviews(
        dragItem: DragDrop.ExistingEntitiesDragItem,
        dragItemOffsets: DragItemOffsets
    ) {
        const diffFromOffsetXYCoord = dragItemOffsets.differenceFromInitialOffset;
        if (diffFromOffsetXYCoord != null) {
            const delta = snapPointToGrid(
                diffFromOffsetXYCoord,
                this.props.gridSize
            );

            const dragItemRects = dragItem.entityIds
                .map(entityId => {
                    const entity = this.props.entities.find(e => e.id === entityId);
                    return entity
                        ? {
                              x: entity.position.x + delta.x,
                              y: entity.position.y + delta.y,
                              ...dragItem.size
                          }
                        : null;
                })
                .filter((x: Rect | null): x is Rect => x !== null);

            return ReactDOM.createPortal(
                <AbsoluteDragItemLayer>
                    {this.renderDashedPreviewRectangles(...dragItemRects)}
                </AbsoluteDragItemLayer>,
                this.props.canvas
            );
        }
    }

    renderDashedPreviewRectangles(...previewRectangles: Rect[]) {
        return previewRectangles.map((rect, index) => {
            const { x, y, width, height } = rect;
            const key = `drag-preview-${x}_${y}_${width}_${height}_${index}`;

            const style: React.CSSProperties = {
                position: "absolute",
                left: x,
                top: y,
                width,
                height
            };

            return (
                <svg xmlns="http://www.w3.org/2000/svg" style={style} key={key}>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="none"
                        stroke="black"
                        strokeDasharray="5,5"
                        strokeWidth="2"
                    />
                </svg>
            );
        });
    }
}

interface OwnProps {
    canvas: HTMLElement;
}

interface DragItemOffsets {
    sourceClientOffset: XYCoord | null;
    differenceFromInitialOffset: XYCoord | null;
}

interface DragDropProps {
    dragItem: DragDrop.DragItem | null;
    dragItemOffsets: DragItemOffsets | null;
}

interface StateProps {
    entities: Entity[];
    canvasSize: Size;
    gridSize: number;
}

type Props = OwnProps & DragDropProps & StateProps;

const collect: DragLayerCollector<any, any> = (monitor): DragDropProps => {
    const dragItem = monitor.getItem() as DragDrop.DragItem | null;
    const sourceClientOffset = monitor.getSourceClientOffset();
    const differenceFromInitialOffset = monitor.getDifferenceFromInitialOffset();

    return {
        dragItem,
        dragItemOffsets:
            sourceClientOffset === null
                ? null
                : {
                      sourceClientOffset,
                      differenceFromInitialOffset
                  }
    };
};

function mapStateToProps(state: ReduxState): StateProps {
    return {
        entities: getAllEntities(state),
        canvasSize: state.editor.canvasSize,
        gridSize: state.editor.gridSize
    };
}

export default (DndDragLayer(collect)(
    connect(mapStateToProps)(DragLayer as any)
) as any) as React.ComponentClass<OwnProps>;
