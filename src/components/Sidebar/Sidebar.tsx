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
import Element, { ElementRepository } from '../../domain/Element';

import { Draggable, DropEvent } from './../Draggable';

import ElementComponent from './../LayoutedElement/ElementComponent';
import Class from './../../domain/plugins/class/Class';
import Attribute from './../../domain/plugins/class/Attribute';
import InitialNode from './../../domain/plugins/activity/InitialNode';
import FinalNode from './../../domain/plugins/activity/FinalNode';
import ActionNode from './../../domain/plugins/activity/ActionNode';
import ObjectNode from './../../domain/plugins/activity/ObjectNode';
import MergeNode from './../../domain/plugins/activity/MergeNode';
import ForkNode from './../../domain/plugins/activity/ForkNode';
import { CanvasProvider } from '../Canvas/CanvasContext';

class Sidebar extends Component<Props> {
  get previews(): Element[] {
    switch (this.props.diagramType) {
      case DiagramType.ClassDiagram:
        return [new Class()];
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

  onDrop = (element: Element) => (event: DropEvent) => {
    switch (element.kind) {
      case "Class":
        const newElement = new Class();
        newElement.bounds = { ...newElement.bounds, ...event.position };

        const attribute = newElement.addAttribute();
        const method = newElement.addMethod();
        [newElement, attribute, method].map(this.props.create);
        return;
    }
    const Clazz = element.constructor.prototype.constructor;
    const newElement = new Clazz(element.name);
    if (event.position) {
      newElement.bounds.x = event.position.x;
      newElement.bounds.y = event.position.y;
    }
    this.props.create(newElement);
  }

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
            [EditorMode.ModelingView]: (
              <CanvasProvider value={null}>
                {this.previews.map((element, index) => (
                  <Draggable key={index} onDrop={this.onDrop(element)}>
                    <div>
                      <ElementComponent element={element} />
                    </div>
                  </Draggable>
                ))}
              </CanvasProvider>
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
  create: typeof ElementRepository.create;
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
    create: ElementRepository.create,
    selectEditorMode: EditorService.update,
  }
)(Sidebar);
