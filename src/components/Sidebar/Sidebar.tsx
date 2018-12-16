import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import {
  Container,
  EditorModeSelection,
  EditorModeSelectionSegment,
} from './styles';
import EditorService, {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
  DiagramType,
} from './../../services/EditorService';
import * as Plugins from './../../domain/plugins';
import Element from '../../domain/Element';
import Draggable from './../DragDrop/Draggable';
import { EntityKind } from '../../core/domain';

class Sidebar extends Component<Props> {
  elements: { [key: string]: Element } = Object.entries(Plugins).reduce(
    (o, [k, v]) => ({
      ...o,
      [k]: new v(k, { x: 0, y: 0 }, { width: 110, height: 80 }),
    }),
    {}
  );

  selectEditorMode = (mode: EditorMode) => () =>
    this.props.selectEditorMode({ editorMode: mode });

  selectInteractiveElementsMode = (mode: InteractiveElementsMode) =>
    this.props.selectEditorMode({ interactiveMode: mode });

  toggleInteractiveElementsMode = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const { checked } = event.currentTarget;
    const interactiveElementsMode = checked
      ? InteractiveElementsMode.Highlighted
      : InteractiveElementsMode.Hidden;

    this.selectInteractiveElementsMode(interactiveElementsMode);
  };

  render() {
    const options = {
      editorMode: EditorMode.ModelingView,
      hover: false,
      interactiveElementIds: new Set(),
      interactiveElementsMode: InteractiveElementsMode.Highlighted,
      theme: {},
      toggleInteractiveElements: () => {},
    };
    if (this.props.apollonMode === ApollonMode.ReadOnly) return null;
    return (
      <Container>
        {this.props.apollonMode === ApollonMode.Full && (
          <EditorModeSelection>
            <EditorModeSelectionSegment
              onClick={this.selectEditorMode(EditorMode.ModelingView)}
              selected={this.props.editorMode === EditorMode.ModelingView}
            >
              Diagram Modeling
            </EditorModeSelectionSegment>
            <EditorModeSelectionSegment
              onClick={this.selectEditorMode(
                EditorMode.InteractiveElementsView
              )}
              selected={this.props.editorMode === EditorMode.InteractiveElementsView}
            >
              Interactive Areas
            </EditorModeSelectionSegment>
          </EditorModeSelection>
        )}
        {
          {
            [EditorMode.ModelingView]: Object.entries(this.elements).map(
              ([k, v]) => (
                <Draggable key={k} kind={k as EntityKind}>
                  {v.render && v.render(options)}
                </Draggable>
              )
            ),
            [EditorMode.InteractiveElementsView]: (
              <label htmlFor="toggleInteractiveElementsMode">
                <input
                  id="toggleInteractiveElementsMode"
                  type="checkbox"
                  checked={
                    this.props.interactiveElementsMode ===
                    InteractiveElementsMode.Highlighted
                  }
                  onChange={this.toggleInteractiveElementsMode}
                />
                Show interactive elements
              </label>
            ),
          }[this.props.editorMode]
        }
      </Container>
    );
  }
}

interface StateProps {
  diagramType: DiagramType;
  apollonMode: ApollonMode;
  editorMode: EditorMode;
  interactiveElementsMode: InteractiveElementsMode;
}

interface DispatchProps {
  selectEditorMode: typeof EditorService.update;
}

type Props = StateProps & DispatchProps;

const mapStateToProps = (state: ReduxState) => ({
  diagramType: state.editor.diagramType,
  apollonMode: state.editor.mode,
  editorMode: state.editor.editorMode,
  interactiveElementsMode: state.editor.interactiveMode,
});

export default connect(
  mapStateToProps,
  {
    selectEditorMode: EditorService.update,
  }
)(Sidebar);
