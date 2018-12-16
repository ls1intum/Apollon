import * as React from "react";
import LabeledCheckbox from "./LabeledCheckbox";
import { InteractiveElementsMode } from "../../../services/EditorService";

export default class InteractiveElementsPanel extends React.Component<Props> {
    highlightInteractiveElements = (shouldHighlight: boolean) => {
        const interactiveElementsMode = shouldHighlight
            ? InteractiveElementsMode.Highlighted
            : InteractiveElementsMode.Hidden;

        this.props.selectInteractiveElementsMode(interactiveElementsMode);
    };

    render() {
        return (
            <LabeledCheckbox
                label="Show interactive elements"
                checked={this.props.interactiveElementsMode === InteractiveElementsMode.Highlighted}
                onChange={this.highlightInteractiveElements}
            />
        );
    }
}

interface Props {
    interactiveElementsMode: InteractiveElementsMode;
    selectInteractiveElementsMode: (newMode: InteractiveElementsMode) => void;
}
