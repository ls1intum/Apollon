import * as React from "react";
import styled from "styled-components";
import EditorModeSelection from "./EditorModeSelection";
import EntityPool from "./EntityPool";
import ExportPanel from "./ExportPanel";
import InteractiveElementsPanel from "./InteractiveElementsPanel";
import LocalStateForm from "./LocalStateForm";
import { ApollonMode, EditorMode, InteractiveElementsMode } from "../../types";
import { Entity, Relationship } from "../../../core/domain";

const FlexContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: scroll;
    padding-left: 30px;
    padding-right: 30px;
    background: white;
`;

const FlexGrowItem = styled.div`
    flex-grow: 1;
`;

export default class Sidebar extends React.Component<Props> {
    render() {
        return (
            <FlexContainer>
                <div style={{ height: 4 }} />

                {this.props.apollonMode === ApollonMode.Full && (
                    <React.Fragment>
                        <EditorModeSelection
                            editorMode={this.props.editorMode}
                            selectEditorMode={this.props.selectEditorMode}
                        />
                        <div style={{ height: 25 }} />
                    </React.Fragment>
                )}

                <FlexGrowItem>{this.renderElements()}</FlexGrowItem>

                {this.props.debugModeEnabled && (
                    <>
                        <ExportPanel interactiveElementsMode={this.props.interactiveElementsMode} />
                        <div style={{ height: 25 }} />
                        <LocalStateForm />
                    </>
                )}
            </FlexContainer>
        );
    }

    renderElements() {
        switch (this.props.editorMode) {
            case EditorMode.ModelingView:
                return <EntityPool />;

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
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    debugModeEnabled: boolean;
    interactiveElementsMode: InteractiveElementsMode;
    selectEditorMode: (newMode: EditorMode) => void;
    selectInteractiveElementsMode: (newMode: InteractiveElementsMode) => void;
}
