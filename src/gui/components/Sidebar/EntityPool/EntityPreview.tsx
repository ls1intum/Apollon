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

const StyledActivityControlNode: any = styled.div`
    width: 30px;
    height: 30px;
`;

const Bold = styled.span`
    font-weight: bold;
    margin-top: auto;
    margin-bottom: auto;
`;

class EntityPreview extends React.Component<Props> {
    componentDidMount() {
        this.props.connectDragPreview(getEmptyImage());
    }

    render() {
        const label = EntityPreview.getLabel(this.props.kind);

        return this.props.connectDragSource(
            <div>{label}</div>
        );
    }

    static getLabel(kind: EntityKind): JSX.Element {
        switch (kind) {
            case EntityKind.Class:
                return (
                    <StyledEntityPreview>
                        <div>
                            <Bold>Class</Bold>
                        </div>
                        <div />
                        <div />
                    </StyledEntityPreview>
                );

            case EntityKind.AbstractClass:
                return (
                    <StyledEntityPreview>
                        <div>
                            <Bold>
                                <em>AbstractClass</em>
                            </Bold>
                        </div>
                        <div />
                        <div />
                    </StyledEntityPreview>
                );

            case EntityKind.Enumeration:
                return (
                    <StyledEntityPreview>
                        <div>
                            <div style={{ fontSize: "85%" }}>&laquo;enumeration&raquo;</div>
                            <Bold>Enumeration</Bold>
                        </div>
                        <div />
                    </StyledEntityPreview>
                );

            case EntityKind.Interface:
                return (
                    <StyledEntityPreview>
                        <div>
                            <div style={{ fontSize: "85%" }}>&laquo;interface&raquo;</div>
                            <Bold>Interface</Bold>
                        </div>
                        <div />
                    </StyledEntityPreview>
                );

            case EntityKind.ActivityControlInitialNode:
                return (
                    <StyledActivityControlNode>
                        ●
                    </StyledActivityControlNode>
                );

            case EntityKind.ActivityControlFinalNode:
                return (
                    <StyledActivityControlNode>
                        ◉
                    </StyledActivityControlNode>
                );

            case EntityKind.ActivityActionNode:
                return (
                    <StyledEntityPreview>
                        <Bold>
                            <em>Action Node</em>
                        </Bold>
                    </StyledEntityPreview>
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
