import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { Container, Preview, EditorModeSelection, EditorModeSelectionSegment } from './sidebar-styles';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Draggable } from '../draggable/draggable';
import { DropEvent } from '../draggable/drop-event';
import { ElementComponent } from '../layouted-element/element-component';
import { CanvasProvider } from '../canvas/canvas-context';
import { ApollonMode, DiagramType } from '../../typings';
import { ApollonView } from '../../services/editor/editor-types';
import { EditorRepository } from '../../services/editor/editor-repository';
import { ElementType } from '../../packages/element-type';
import { Package } from '../../packages/common/package/package';
import { Class } from '../../packages/class-diagram/classifier/class/class';
import { AbstractClass } from '../../packages/class-diagram/classifier/abstract-class/abstract-class';
import { Interface } from '../../packages/class-diagram/classifier/interface/interface';
import { Enumeration } from '../../packages/class-diagram/classifier/enumeration/enumeration';
import { ClassAttribute } from '../../packages/class-diagram/class-member/class-attribute/class-attribute';
import { ClassMethod } from '../../packages/class-diagram/class-member/class-method/class-method';
import { ObjectName } from '../../packages/object-diagram/object-name/object-name';
import { ObjectAttribute } from '../../packages/object-diagram/object-attribute/object-attribute';
import { ActivityInitialNode } from '../../packages/activity-diagram/activity-initial-node/activity-initial-node';
import { ActivityFinalNode } from '../../packages/activity-diagram/activity-final-node/activity-final-node';
import { ActivityActionNode } from '../../packages/activity-diagram/activity-action-node/activity-action-node';
import { ActivityObjectNode } from '../../packages/activity-diagram/activity-object-node/activity-object-node';
import { ActivityMergeNode } from '../../packages/activity-diagram/activity-merge-node/activity-merge-node';
import { ActivityForkNode } from '../../packages/activity-diagram/activity-fork-node/activity-fork-node';
import { UseCase } from '../../packages/use-case-diagram/use-case/use-case';
import { UseCaseActor } from '../../packages/use-case-diagram/use-case-actor/use-case-actor';
import { UseCaseSystem } from '../../packages/use-case-diagram/use-case-system/use-case-system';

class SidebarComponent extends Component<Props, State> {
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

const enhance = connect<StateProps, DispatchProps, {}, ModelState>(
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
);

export const Sidebar = enhance(SidebarComponent);
