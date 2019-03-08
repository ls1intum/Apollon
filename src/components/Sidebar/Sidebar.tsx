import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import {
  Container,
  Preview,
  EditorModeSelection,
  EditorModeSelectionSegment,
} from './styles';
import EditorService, {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from './../../services/EditorService';
import { DiagramType } from './../../domain/Diagram';
import Element, { ElementRepository } from '../../domain/Element';

import { Draggable, DropEvent } from './../Draggable';

import ElementComponent from './../LayoutedElement/ElementComponent';
import Package from './../../domain/plugins/common/Package';
import Class from './../../domain/plugins/class/Class';
import Interface from './../../domain/plugins/class/Interface';
import Enumeration from './../../domain/plugins/class/Enumeration';
import Attribute from './../../domain/plugins/class/Attribute';
import InitialNode from './../../domain/plugins/activity/InitialNode';
import FinalNode from './../../domain/plugins/activity/FinalNode';
import ActionNode from './../../domain/plugins/activity/ActionNode';
import ObjectNode from './../../domain/plugins/activity/ObjectNode';
import MergeNode from './../../domain/plugins/activity/MergeNode';
import ForkNode from './../../domain/plugins/activity/ForkNode';
import { CanvasProvider } from '../Canvas/CanvasContext';
import { Method } from './../../domain/plugins';

class Sidebar extends Component<Props, State> {
  state: State = {
    previews: [],
  };

  private refresh = () => {
    switch (this.props.diagramType) {
      case DiagramType.ClassDiagram:
        this.setState({
          previews: [
            new Package(),
            new Class(),
            new Class('AbstractClass', true),
            new Interface(),
            new Enumeration(),
          ],
        });
        break;
      case DiagramType.ActivityDiagram:
        this.setState({
          previews: [
            new InitialNode(),
            new FinalNode(),
            new ActionNode(),
            new ObjectNode(),
            new MergeNode(),
            new ForkNode(),
          ],
        });
        break;
    }
  };

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
    event.action = {
      type: 'CREATE',
      element,
    };
    this.refresh();

    setTimeout(() => {
      switch (element.kind) {
        case 'Class':
        case 'Interface': {
          [
            new Attribute('+ attribute: Type'),
            new Method('+ method()'),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        }
        case 'Enumeration': {
          [
            new Attribute('Case1'),
            new Attribute('Case2'),
            new Attribute('Case3'),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        }
      }
    }, 0);
  };

  componentDidMount() {
    this.refresh();
  }

  render() {
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
                {this.state.previews.map((element, index) => (
                  <Draggable key={index} onDrop={this.onDrop(element)}>
                    <Preview>
                      <ElementComponent element={element} />
                    </Preview>
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

interface State {
  previews: Element[];
}

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
