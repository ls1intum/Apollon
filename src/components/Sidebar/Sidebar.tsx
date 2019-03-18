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
import Element, { ElementRepository, ElementKind } from '../../domain/Element';

import { Draggable, DropEvent } from './../Draggable';

import ElementComponent from './../LayoutedElement/ElementComponent';
import { CanvasProvider } from '../Canvas/CanvasContext';
import {
  UseCase,
  UseCaseActor,
  UseCaseSystem,
  Class,
  ClassAttribute,
  ClassMethod,
  AbstractClass,
  Interface,
  Enumeration,
  ActivityInitialNode,
  ActivityFinalNode,
  ActivityActionNode,
  ActivityObjectNode,
  ActivityMergeNode,
  ActivityForkNode,
} from './../../domain/plugins';

class Sidebar extends Component<Props, State> {
  state: State = {
    previews: [],
  };

  private refresh = () => {
    switch (this.props.diagramType) {
      case DiagramType.ClassDiagram:
        this.setState({
          previews: [
            // new Package(),
            new Class('Class'),
            new AbstractClass('AbstractClass'),
            new Interface('Interface'),
            new Enumeration('Enumeration'),
          ],
        });
        break;
      case DiagramType.ActivityDiagram:
        this.setState({
          previews: [
            new ActivityInitialNode(''),
            new ActivityFinalNode(''),
            new ActivityActionNode('ActionNode'),
            new ActivityObjectNode('ObjectNode'),
            new ActivityMergeNode('Condition'),
            new ActivityForkNode(''),
          ],
        });
        break;
      case DiagramType.UseCaseDiagram:
        this.setState({
          previews: [
            new UseCase('UseCase'),
            new UseCaseActor('Actor'),
            new UseCaseSystem('System'),
          ],
        });
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
        case ElementKind.Class:
        case ElementKind.AbstractClass:
        case ElementKind.Interface:
          [
            new ClassAttribute('+ attribute: Type'),
            new ClassMethod('+ method()'),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        case ElementKind.Enumeration:
          [
            new ClassAttribute('Case1'),
            new ClassAttribute('Case2'),
            new ClassAttribute('Case3'),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
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
