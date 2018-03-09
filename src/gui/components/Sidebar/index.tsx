import * as React from "react";
import styled from "styled-components";
import EditorModeSelection from "./EditorModeSelection";
import ExportPanel from "./ExportPanel";
import InteractiveElementsPanel from "./InteractiveElementsPanel";
import LocalStateForm from "./LocalStateForm";
import Toolbox from "./Toolbox";
import { EditorMode, InteractiveElementsMode } from "../../types";
import { Entity, Relationship } from "../../../core/domain";

const FlexContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: scroll;
    padding-left: 30px;
    background: white;
`;

const FlexGrowItem = styled.div`
    flex-grow: 1;
`;

const Spacer = styled.div`
    height: 30px;
`;

export default class Sidebar extends React.Component<Props> {
    render() {
        return (
            <FlexContainer>
                <EditorModeSelection
                    editorMode={this.props.editorMode}
                    selectEditorMode={this.props.selectEditorMode}
                />

                <Spacer />

                <FlexGrowItem>{this.renderElements()}</FlexGrowItem>

                <ExportPanel interactiveElementsMode={this.props.interactiveElementsMode} />
                <Spacer />
                <LocalStateForm />
            </FlexContainer>
        );
    }

    renderElements() {
        switch (this.props.editorMode) {
            case EditorMode.ModelingView:
                return <Toolbox />;

            case EditorMode.InteractiveElementsView:
                return (
                    <InteractiveElementsPanel
                        interactiveElementsMode={this.props.interactiveElementsMode}
                        selectInteractiveElementsMode={this.props.selectInteractiveElementsMode}
                    />
                );

            default:
                return null;
        }
    }
}

interface Props {
    selectedEntities: Entity[];
    selectedRelationships: Relationship[];
    editorMode: EditorMode;
    interactiveElementsMode: InteractiveElementsMode;
    selectEditorMode: (newMode: EditorMode) => void;
    selectInteractiveElementsMode: (newMode: InteractiveElementsMode) => void;
}
