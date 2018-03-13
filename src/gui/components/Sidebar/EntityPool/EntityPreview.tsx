import * as React from "react";
import {
    ConnectDragPreview,
    ConnectDragSource,
    DragSource,
    DragSourceCollector,
    DragSourceSpec
} from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled from "styled-components";
import * as DragDrop from "../../dnd";
import { EntityKind } from "../../../../core/domain";
import { assertNever } from "../../../../core/utils";
import { computeEntityHeight, getDefaultEntityWidth } from "../../../../rendering/layouters/entity";

const StyledEntityPreview: any = styled.div`
    width: 145px;
    height: 90px;
    display: flex;
    flex-direction: column;
    border: 1px solid black;
    cursor: move;
    user-select: none;
    text-align: center;

    :hover {
        box-shadow: ${(props: any) =>
            props.isDragging ? "none" : `0 0 0 4px ${props.theme.highlightColor};`};
    }

    > div {
        flex-grow: 1;
        border-top: 1px solid black;

        :first-child {
            padding: 10px;
            flex-grow: 0;
            border-top: none;
        }
    }
`;

const Bold = styled.span`
    font-weight: bold;
`;

class EntityPreview extends React.Component<Props> {
    componentDidMount() {
        this.props.connectDragPreview(getEmptyImage());
    }

    render() {
        const label = EntityPreview.getLabel(this.props.kind);

        return this.props.connectDragSource(
            <div>
                <StyledEntityPreview>{label}</StyledEntityPreview>
            </div>
        );
    }

    static getLabel(kind: EntityKind): JSX.Element {
        switch (kind) {
            case EntityKind.Class:
                return (
                    <>
                        <div>
                            <Bold>Class</Bold>
                        </div>
                        <div />
                        <div />
                    </>
                );

            case EntityKind.AbstractClass:
                return (
                    <>
                        <div>
                            <Bold>
                                <em>AbstractClass</em>
                            </Bold>
                        </div>
                        <div />
                        <div />
                    </>
                );

            case EntityKind.Enumeration:
                return (
                    <>
                        <div>
                            <div style={{ fontSize: "85%" }}>&laquo;enumeration&raquo;</div>
                            <Bold>Enumeration</Bold>
                        </div>
                        <div />
                    </>
                );

            case EntityKind.Interface:
                return (
                    <>
                        <div>
                            <div style={{ fontSize: "85%" }}>&laquo;interface&raquo;</div>
                            <Bold>Interface</Bold>
                        </div>
                        <div />
                    </>
                );

            default:
                return assertNever(kind);
        }
    }
}

interface OwnProps {
    kind: EntityKind;
}

interface DragDropProps {
    connectDragPreview: ConnectDragPreview;
    connectDragSource: ConnectDragSource;
    isDragging: boolean;
}

type Props = OwnProps & DragDropProps;

const dragSourceSpec: DragSourceSpec<OwnProps> = {
    beginDrag(props): DragDrop.DragItem {
        return {
            type: DragDrop.ItemTypes.NewEntity,
            kind: props.kind,
            size: {
                width: getDefaultEntityWidth(),
                height: computeEntityHeight(props.kind, 1, 1, {
                    showAttributes: true,
                    showMethods: true
                })
            }
        };
    }
};

const dragSourceCollector: DragSourceCollector = (connector, monitor): DragDropProps => ({
    connectDragPreview: connector.dragPreview(),
    connectDragSource: connector.dragSource(),
    isDragging: monitor.isDragging()
});

export default DragSource<OwnProps>(
    DragDrop.ItemTypes.NewEntity,
    dragSourceSpec,
    dragSourceCollector
)(EntityPreview as any);
