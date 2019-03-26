import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import { Container, Preview, EditorModeSelection, EditorModeSelectionSegment } from './styles';
import { DiagramType } from '../../services/diagram';
import { Element, ElementRepository, ElementType } from '../../services/element';
import { Draggable, DropEvent } from './../Draggable';
import ElementComponent from './../LayoutedElement/ElementComponent';
import { CanvasProvider } from '../Canvas/CanvasContext';
import { ApollonMode } from '../..';
import { ApollonView, EditorRepository } from '../../services/editor';
import { Package } from '../../domain/plugins/Common/Package';
import { Class } from '../../domain/plugins/ClassDiagram/Classifier/Class';
import { AbstractClass } from '../../domain/plugins/ClassDiagram/Classifier/AbstractClass';
import { Interface } from '../../domain/plugins/ClassDiagram/Classifier/Interface';
import { Enumeration } from '../../domain/plugins/ClassDiagram/Classifier/Enumeration';
import { ClassAttribute } from '../../domain/plugins/ClassDiagram/ClassMember/ClassAttribute';
import { ClassMethod } from '../../domain/plugins/ClassDiagram/ClassMember/ClassMethod';
import { ObjectName } from '../../domain/plugins/ObjectDiagram/ObjectName';
import { ObjectAttribute } from '../../domain/plugins/ObjectDiagram/ObjectAttribute';
import { ActivityInitialNode } from '../../domain/plugins/ActivityDiagram/ActivityInitialNode';
import { ActivityFinalNode } from '../../domain/plugins/ActivityDiagram/ActivityFinalNode';
import { ActivityActionNode } from '../../domain/plugins/ActivityDiagram/ActivityActionNode';
import { ActivityObjectNode } from '../../domain/plugins/ActivityDiagram/ActivityObjectNode';
import { ActivityMergeNode } from '../../domain/plugins/ActivityDiagram/ActivityMergeNode';
import { ActivityForkNode } from '../../domain/plugins/ActivityDiagram/ActivityForkNode';
import { UseCase } from '../../domain/plugins/UseCaseDiagram/UseCase';
import { UseCaseActor } from '../../domain/plugins/UseCaseDiagram/UseCaseActor';
import { UseCaseSystem } from '../../domain/plugins/UseCaseDiagram/UseCaseSystem';

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
            (() => {
              const c = new Class();
              c.name = 'Class';
              return c;
            })(),
            (() => {
              const c = new AbstractClass();
              c.name = 'AbstractClass';
              return c;
            })(),
            (() => {
              const c = new Interface();
              c.name = 'Interface';
              return c;
            })(),
            (() => {
              const c = new Enumeration();
              c.name = 'Enumeration';
              return c;
            })(),
          ],
        });
        break;
      case DiagramType.ObjectDiagram:
        this.setState({
          previews: [
            (() => {
              const c = new ObjectName();
              c.name = 'Object : Class';
              return c;
            })(),
          ],
        });
        break;
      case DiagramType.ActivityDiagram:
        this.setState({
          previews: [
            new ActivityInitialNode(),
            new ActivityFinalNode(),
            (() => {
              const c = new ActivityActionNode();
              c.name = 'ActionNode';
              return c;
            })(),
            (() => {
              const c = new ActivityObjectNode();
              c.name = 'ObjectNode';
              return c;
            })(),
            (() => {
              const c = new ActivityMergeNode();
              c.name = 'Condition';
              return c;
            })(),
            new ActivityForkNode(),
          ],
        });
        break;
      case DiagramType.UseCaseDiagram:
        this.setState({
          previews: [
            (() => {
              const c = new UseCase();
              c.name = 'UseCase';
              return c;
            })(),
            (() => {
              const c = new UseCaseActor();
              c.name = 'Actor';
              return c;
            })(),
            (() => {
              const c = new UseCaseSystem();
              c.name = 'System';
              return c;
            })(),
          ],
        });
    }
  };

  changeView = (view: ApollonView) => () => this.props.changeView(view);

  toggleInteractiveElementsMode = (event: React.FormEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked ? ApollonView.Exporting : ApollonView.Highlight;

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
            (() => {
              const c = new ClassAttribute();
              c.name = '+ attribute: Type';
              return c;
            })(),
            (() => {
              const c = new ClassMethod();
              c.name = '+ method()';
              return c;
            })(),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        case ElementType.Enumeration:
          [
            (() => {
              const c = new ClassAttribute();
              c.name = 'Case1';
              return c;
            })(),
            (() => {
              const c = new ClassAttribute();
              c.name = 'Case2';
              return c;
            })(),
            (() => {
              const c = new ClassAttribute();
              c.name = 'Case3';
              return c;
            })(),
          ].forEach(member => {
            member.owner = element.id;
            this.props.create(member);
          });
          break;
        case ElementType.ObjectName:
          [
            (() => {
              const c = new ObjectAttribute();
              c.name = 'attribute = value';
              return c;
            })(),
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
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return null;
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
              selected={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
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
