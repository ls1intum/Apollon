import * as React from "react";
import { ConnectDragPreview, ConnectDragSource, DragSource, DragSourceCollector, DragSourceSpec } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import styled from "styled-components";
import * as DragDrop from "./../../../gui/components/dnd";
import { EntityKind } from "./../../../core/domain";
import { assertNever } from "./../../../core/utils";
import { computeEntityHeight, getDefaultEntityWidth } from "./../../../rendering/layouters/entity";

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
    width: 100px;
    height: 100px;
`;

const StyledActivityActionNode: any = styled(StyledEntityPreview)`
    border-radius: 10px;
`;

const StyledActivityMergeNode: any = styled.div`
    position: relative;
    width: 40px;
    height: 40px;
    line-height: 30px;
    text-align: center;
    margin: 5px;
    &:before {
        position: absolute;
        content: '';
        top: 0px;
        left: 0px;
        height: 100%;
        width: 100%;
        transform: rotateX(45deg) rotateZ(45deg);
        border: thin solid black;
    }
`;

const StyledActivityForkNode: any = styled.div`
    position: relative;
    width: 20px;
    height: 60px;
    line-height: 30px;
    text-align: center;
    margin: 5px;
    &:before {
        position: absolute;
        content: '';
        top: 0px;
        left: 0px;
        height: 100%;
        width: 100%;
        background: black;
    }
`;

const StyledActivityForkNodeHorizontal: any = styled.div`
    position: relative;
    width: 60px;
    height: 20px;
    line-height: 30px;
    text-align: center;
    margin: 5px;
    &:before {
        position: absolute;
        content: '';
        top: 0px;
        left: 0px;
        height: 100%;
        width: 100%;
        background: black;
    }
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
                        <div style={{ fontSize: "250%" }}>●</div>
                        <div style={{ fontSize: "85%" }}>Start</div>
                    </StyledActivityControlNode>
                );

            case EntityKind.ActivityControlFinalNode:
                return (
                    <StyledActivityControlNode>
                        <div style={{ fontSize: "250%" }}>◉</div>
                        <div style={{ fontSize: "85%" }}>End</div>
                    </StyledActivityControlNode>
                );

            case EntityKind.ActivityActionNode:
                return (
                    <StyledActivityActionNode>
                        <Bold>
                            <em>Action</em>
                        </Bold>
                    </StyledActivityActionNode>
                );

            case EntityKind.ActivityObject:
                return (
                    <StyledEntityPreview>
                        <Bold>
                            <em>Object</em>
                        </Bold>
                    </StyledEntityPreview>
                );

            case EntityKind.ActivityMergeNode:
                return (
                    <StyledActivityControlNode>
                        <StyledActivityMergeNode />
                        <div style={{ fontSize: "85%" }}>Merge</div>
                    </StyledActivityControlNode>
                );

            case EntityKind.ActivityForkNode:
                return (
                    <StyledActivityControlNode>
                        <StyledActivityForkNode />
                        <div style={{ fontSize: "85%" }}>Fork</div>
                    </StyledActivityControlNode>
                );
            
            case EntityKind.ActivityForkNodeHorizontal:
                return (
                    <StyledActivityControlNode>
                        <StyledActivityForkNodeHorizontal />
                        <div style={{ fontSize: "85%" }}>Fork Horizontal</div>
                    </StyledActivityControlNode>
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

const dragSourceSpec: DragSourceSpec<OwnProps, any> = {
    beginDrag(props): DragDrop.DragItem {
        return {
            type: DragDrop.ItemTypes.NewEntity,
            kind: props.kind,
            size: {
                width: getDefaultEntityWidth(props.kind),
                height: computeEntityHeight(props.kind, 1, 1, {
                    showAttributes: true,
                    showMethods: true
                })
            }
        };
    }
};

const dragSourceCollector: DragSourceCollector<any> = (connector, monitor): DragDropProps => ({
    connectDragPreview: connector.dragPreview(),
    connectDragSource: connector.dragSource(),
    isDragging: monitor.isDragging()
});

export default DragSource<OwnProps>(
    DragDrop.ItemTypes.NewEntity,
    dragSourceSpec,
    dragSourceCollector
)(EntityPreview as any);