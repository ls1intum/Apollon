import React, { Component, createRef } from 'react';
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
} from './../../services/EditorService';
import { DiagramType } from './../../domain/Diagram';
import * as Plugins from './../../domain/plugins';
import Element from '../../domain/Element';
import Draggable from './../DragDrop/Draggable';
import { EntityKind } from '../../domain/Element';

import ElementComponent from './../LayoutedElement/ElementComponent';
import InitialNode from './../../domain/plugins/activity/InitialNode';
import FinalNode from './../../domain/plugins/activity/FinalNode';
import ActionNode from './../../domain/plugins/activity/ActionNode';
import ObjectNode from './../../domain/plugins/activity/ObjectNode';
import MergeNode from './../../domain/plugins/activity/MergeNode';
import ForkNode from './../../domain/plugins/activity/ForkNode';

class Sidebar extends Component<Props> {
  get previews(): Element[] {
    switch (this.props.diagramType) {
      case DiagramType.ActivityDiagram:
        return [
          new InitialNode(),
          new FinalNode(),
          new ActionNode(),
          new ObjectNode(),
          new MergeNode(),
          new ForkNode(),
        ];
    }
    return [];
  }

  elements: { [key: string]: Element } = Object.entries(Plugins)
    .filter(([k, v]) => !k.includes('Component'))
    .reduce(
      (o, [k, v]: [string, any]) => ({
        ...o,
        [k]: new v(),
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
              selected={
                this.props.editorMode === EditorMode.InteractiveElementsView
              }
            >
              Interactive Areas
            </EditorModeSelectionSegment>
          </EditorModeSelection>
        )}
        {
          {
            [EditorMode.ModelingView]: this.previews.map((element, index) => (
              <Draggable key={index} kind={element.kind as EntityKind}>
                <ElementComponent element={element} canvas={createRef()} />
              </Draggable>
            )),
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
  diagramType: state.diagram.type,
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
