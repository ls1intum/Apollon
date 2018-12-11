import * as React from "react";
import { connect } from 'react-redux';
import styled from "styled-components";
import EditorModeSelection from "./EditorModeSelection";
import EntityPool from "./EntityPool";
import ExportPanel from "./ExportPanel";
import InteractiveElementsPanel from "./InteractiveElementsPanel";
import LocalStateForm from "./LocalStateForm";
import { ApollonMode, DiagramType, EditorMode, InteractiveElementsMode } from "../../domain/Options/types";

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

class Sidebar extends React.Component<Props> {
    render() {
        if (this.props.apollonMode === ApollonMode.ReadOnly) return null;
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
                return <EntityPool diagramType={this.props.diagramType} />;

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
    diagramType: DiagramType;
    apollonMode: ApollonMode;
    editorMode: EditorMode;
    debugModeEnabled: boolean;
    interactiveElementsMode: InteractiveElementsMode;
    selectEditorMode: (newMode: EditorMode) => void;
    selectInteractiveElementsMode: (newMode: InteractiveElementsMode) => void;
}

const mapStateToProps = (state: any) => ({
    diagramType: state.options.diagramType,
    apollonMode: state.options.mode,
    editorMode: state.options.editorMode,
    debugModeEnabled: state.options.debug,
    interactiveElementsMode: state.options.interactiveMode,
});

const mapDispatchToProps = (dispatch: any) => ({
    selectEditorMode: (editorMode: EditorMode) => dispatch({ type: '@@option/UPDATE', option: { key: 'editorMode', value: editorMode }}),
    selectInteractiveElementsMode: (mode: InteractiveElementsMode) => dispatch({ type: '@@option/UPDATE', option: { key: 'interactiveMode', value: mode }}),
})

export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);