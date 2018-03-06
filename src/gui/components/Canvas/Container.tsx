import * as React from "react";
import { connect } from "react-redux";
import Canvas from "./Canvas";
import { Size } from "../../../geometry";
import { ReduxState } from "../../../redux/state";
import { EditorMode, ElementSelection, InteractiveElementsMode } from "../../../uml";
import { UUID } from "../../../uuid";

class CanvasContainer extends React.Component<Props> {
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
                    innerRef={this.props.innerRef}
                    editorMode={this.props.editorMode}
                    interactiveElementsRenderMode={this.props.interactiveElementsMode}
                    selection={this.props.selection}
                    selectEntity={this.props.selectEntity}
                    selectRelationship={this.props.selectRelationship}
                    toggleEntitySelection={this.props.toggleEntitySelection}
                    toggleRelationshipSelection={this.props.toggleRelationshipSelection}
                    unselectAllElements={this.props.unselectAllElements}
                />
            </div>
        );
    }
}

interface OwnProps {
    innerRef: (canvas: HTMLDivElement | null) => void;
    editorMode: EditorMode;
    interactiveElementsMode: InteractiveElementsMode;
    selection: ElementSelection;
    selectEntity: (entityId: UUID) => void;
    toggleEntitySelection: (entityId: UUID) => void;
    selectRelationship: (relationshipId: UUID) => void;
    toggleRelationshipSelection: (relationshipId: UUID) => void;
    unselectAllElements: () => void;
}

interface StateProps {
    canvasSize: Size;
}

type Props = OwnProps & StateProps;

function mapStateToProps(state: ReduxState): StateProps {
    return {
        canvasSize: state.editor.canvasSize
    };
}

export default connect(mapStateToProps)(CanvasContainer);
