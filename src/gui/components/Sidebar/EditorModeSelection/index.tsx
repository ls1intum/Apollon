import * as React from "react";
import SegmentedControl, { Segment } from "./SegmentedControl";
import { EditorMode } from "../../../../uml";

export default class EditorModeSelection extends React.Component<Props> {
    segments: Segment[] = [
        { id: EditorMode.ModelingView, label: "Diagram Modeling" },
        { id: EditorMode.InteractiveElementsView, label: "Interactive Areas" }
    ];

    onSelectSegment = (segmentId: string) => {
        if (this.props.editorMode !== segmentId) {
            this.props.selectEditorMode(segmentId as EditorMode);
        }
    };

    render() {
        const { editorMode } = this.props;

        return (
            <div>
                <SegmentedControl
                    segments={this.segments}
                    selectedSegmentId={editorMode}
                    onSelectSegment={this.onSelectSegment}
                />
            </div>
        );
    }
}

interface Props {
    editorMode: EditorMode;
    selectEditorMode: (newMode: EditorMode) => void;
}
