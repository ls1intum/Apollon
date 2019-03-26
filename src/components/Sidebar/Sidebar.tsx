import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import {
  Container,
  Preview,
  EditorModeSelection,
  EditorModeSelectionSegment,
} from './styles';
import { DiagramType } from './../../domain/Diagram';
import { Element, ElementRepository, ElementType } from '../../services/element';
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
  Package,
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
            new Package(),
            (() => { const c = new Class(); c.name = 'Class'; return c; })(),
            (() => { const c = new AbstractClass(); c.name = 'AbstractClass'; return c; })(),
            (() => { const c = new Interface(); c.name = 'Interface'; return c; })(),
            (() => { const c = new Enumeration(); c.name = 'Enumeration'; return c; })(),
          ],
        });
        break;
      case DiagramType.ObjectDiagram:
        this.setState({
          previews: [
            (() => { const c = new ObjectName(); c.name = 'Object : Class'; return c; })(),
          ],
        });
        break;
      case DiagramType.ActivityDiagram:
        this.setState({
          previews: [
            new ActivityInitialNode(),
            new ActivityFinalNode(),
            (() => { const c = new ActivityActionNode(); c.name = 'ActionNode'; return c; })(),
            (() => { const c = new ActivityObjectNode(); c.name = 'ObjectNode'; return c; })(),
            (() => { const c = new ActivityMergeNode(); c.name = 'Condition'; return c; })(),
            new ActivityForkNode(),
          ],
        });
        break;
      case DiagramType.UseCaseDiagram:
        this.setState({
          previews: [
            (() => { const c = new UseCase(); c.name = 'UseCase'; return c; })(),
            (() => { const c = new UseCaseActor(); c.name = 'Actor'; return c; })(),
            (() => { const c = new UseCaseSystem(); c.name = 'System'; return c; })(),
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
        case ElementType.Class:
        case ElementType.AbstractClass:
        case ElementType.Interface:
          [
            (() => { const c = new ClassAttribute(); c.name = '+ attribute: Type'; return c; })(),
            (() => { const c = new ClassMethod(); c.name = '+ method()'; return c; })(),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        case ElementType.Enumeration:
          [
            (() => { const c = new ClassAttribute(); c.name = 'Case1'; return c; })(),
            (() => { const c = new ClassAttribute(); c.name = 'Case2'; return c; })(),
            (() => { const c = new ClassAttribute(); c.name = 'Case3'; return c; })(),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        case ElementType.ObjectName:
          [
            (() => { const c = new ObjectAttribute(); c.name = 'attribute = value'; return c; })(),
          ].forEach(member => {
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

export default connect<StateProps, DispatchProps, {}, ModelState>(
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
