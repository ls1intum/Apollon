import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import {
  Container,
  Preview,
  EditorModeSelection,
  EditorModeSelectionSegment,
} from './styles';
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
  ObjectName,
  ObjectAttribute,
} from './../../domain/plugins';
import { ApollonMode } from '../..';
import { ApollonView, EditorRepository } from '../../services/editor';

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
      case DiagramType.ObjectDiagram:
        this.setState({
          previews: [new ObjectName('Object : Class')],
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

  changeView = (view: ApollonView) => () => this.props.changeView(view);

  toggleInteractiveElementsMode = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked
      ? ApollonView.Exporting
      : ApollonView.Highlight;

    this.changeView(view)();
  };

  onDrop = (element: Element) => (event: DropEvent) => {
    event.action = {
      type: 'CREATE',
      element,
    };
    this.refresh();

    setTimeout(() => {
      switch (element.type) {
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
        case ElementKind.ObjectName:
          [new ObjectAttribute('attribute = value')].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
      }
    }, 0);
  };

  componentDidMount() {
    this.refresh();
  }

  render() {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment)
      return null;
    return (
      <Container>
        {this.props.mode === ApollonMode.Exporting && (
          <EditorModeSelection>
            <EditorModeSelectionSegment
              onClick={this.changeView(ApollonView.Modelling)}
              selected={this.props.view === ApollonView.Modelling}
            >
              Diagram Modeling
            </EditorModeSelectionSegment>
            <EditorModeSelectionSegment
              onClick={this.changeView(ApollonView.Exporting)}
              selected={
                this.props.view === ApollonView.Exporting ||
                this.props.view === ApollonView.Highlight
              }
            >
              Interactive Areas
            </EditorModeSelectionSegment>
          </EditorModeSelection>
        )}
        {this.props.view === ApollonView.Modelling ? (
          <CanvasProvider value={null}>
            {this.state.previews.map((element, index) => (
              <Draggable key={index} onDrop={this.onDrop(element)}>
                <Preview>
                  <ElementComponent element={element} />
                </Preview>
              </Draggable>
            ))}
          </CanvasProvider>
        ) : (
          <label htmlFor="toggleInteractiveElementsMode">
            <input
              id="toggleInteractiveElementsMode"
              type="checkbox"
              checked={this.props.view === ApollonView.Exporting}
              onChange={this.toggleInteractiveElementsMode}
            />
            Show interactive elements
          </label>
        )}
      </Container>
    );
  }
}

interface StateProps {
  diagramType: DiagramType;
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  changeView: typeof EditorRepository.changeView;
}

type Props = StateProps & DispatchProps;

interface State {
  previews: Element[];
}

export default connect<StateProps, DispatchProps, {}, ReduxState>(
  state => ({
    diagramType: state.diagram.type2,
    readonly: state.editor.readonly,
    mode: state.editor.mode,
    view: state.editor.view,
  }),
  {
    create: ElementRepository.create,
    changeView: EditorRepository.changeView,
  }
)(Sidebar);
