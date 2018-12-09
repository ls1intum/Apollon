import React from "react";
import { connect } from "react-redux";
import Canvas from "./Canvas";
import { State as ReduxState } from "./../Store";
import { ApollonMode, DiagramType, EditorMode, ElementSelection, InteractiveElementsMode } from "./../../gui/types";
import { Size } from "./../../core/geometry";
import { UUID } from "./../../core/utils";
import DragLayer from "./../../gui/components/DragLayer";

class CanvasContainer extends React.Component<Props> {
    public canvas: HTMLDivElement | null = null;
    public canvasScrollContainer: HTMLDivElement | null = null;

    render() {
        const { width, height } = this.props.canvasSize;

        const style: React.CSSProperties = {
            minWidth: width,
            minHeight: height,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        };

        return (
            <div style={style}>
                <Canvas
                    ref={(ref: any) => (this.canvasScrollContainer = ref)}
                    innerRef={ref => (this.canvas = ref)}
                    diagramType={this.props.diagramType}
                    apollonMode={this.props.apollonMode}
                    editorMode={this.props.editorMode}
                    interactiveElementsRenderMode={this.props.interactiveElementsMode}
                    selection={this.props.selection}
                    canvasScrollContainer={this.canvasScrollContainer}
                />
                <DragLayer
                    canvas={this.canvas!}
                />
            </div>
        );
    }
}

interface OwnProps {
}

interface StateProps {
    canvasSize: Size;
    diagramType: DiagramType;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    interactiveElementsMode: InteractiveElementsMode;
    selection: ElementSelection;
}

type Props = OwnProps & StateProps;

function mapStateToProps(state: ReduxState): StateProps {
    return {
        canvasSize: state.editor.canvasSize,
        diagramType: state.options.diagramType,
        apollonMode: state.options.mode,
        editorMode: state.options.editorMode,
        interactiveElementsMode: state.options.interactiveMode,
        selection: {
            entityIds: Object.keys(state.elements).filter(k => state.elements[k].selected).filter(s => Object.keys(state.entities.byId).includes(s)) as UUID[],
            relationshipIds: Object.keys(state.elements).filter(k => state.elements[k].selected).filter(s => Object.keys(state.relationships.byId).includes(s)) as UUID[],
        },
    };
}

export default connect(mapStateToProps)(CanvasContainer);
