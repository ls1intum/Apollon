import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ActivityActionNode } from '../../packages/activity-diagram/activity-action-node/activity-action-node';
import { ActivityFinalNode } from '../../packages/activity-diagram/activity-final-node/activity-final-node';
import { ActivityForkNode } from '../../packages/activity-diagram/activity-fork-node/activity-fork-node';
import { ActivityInitialNode } from '../../packages/activity-diagram/activity-initial-node/activity-initial-node';
import { ActivityMergeNode } from '../../packages/activity-diagram/activity-merge-node/activity-merge-node';
import { ActivityObjectNode } from '../../packages/activity-diagram/activity-object-node/activity-object-node';
import { ClassAttribute } from '../../packages/class-diagram/class-member/class-attribute/class-attribute';
import { ClassMethod } from '../../packages/class-diagram/class-member/class-method/class-method';
import { AbstractClass } from '../../packages/class-diagram/classifier/abstract-class/abstract-class';
import { Class } from '../../packages/class-diagram/classifier/class/class';
import { Enumeration } from '../../packages/class-diagram/classifier/enumeration/enumeration';
import { Interface } from '../../packages/class-diagram/classifier/interface/interface';
import { Package } from '../../packages/common/package/package';
import { ObjectAttribute } from '../../packages/object-diagram/object-member/object-attribute/object-attribute';
import { ObjectName } from '../../packages/object-diagram/object-name/object-name';
import { UMLElementType } from '../../packages/uml-element-type';
import { UseCaseActor } from '../../packages/use-case-diagram/use-case-actor/use-case-actor';
import { UseCaseSystem } from '../../packages/use-case-diagram/use-case-system/use-case-system';
import { UseCase } from '../../packages/use-case-diagram/use-case/use-case';
import { EditorRepository } from '../../services/editor/editor-repository';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLContainerRepository } from '../../services/uml-container/uml-container-repository';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ApollonMode, DiagramType } from '../../typings';
import { CanvasProvider } from '../canvas/canvas-context';
import { Switch } from '../controls/switch/switch';
import { Draggable } from '../draggable/draggable';
import { DropEvent } from '../draggable/drop-event';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ElementComponent } from '../layouted-element/element-component';
import { ModelState } from '../store/model-state';
import { Container, Preview } from './sidebar-styles';

type OwnProps = {};

type StateProps = {
  diagramType: DiagramType;
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
  changeView: typeof EditorRepository.changeView;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

type State = {
  previews: UMLElement[];
};

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      diagramType: state.diagram.type,
      readonly: state.editor.readonly,
      mode: state.editor.mode,
      view: state.editor.view,
    }),
    {
      create: UMLElementRepository.create,
      changeView: EditorRepository.changeView,
    },
  ),
);

class SidebarComponent extends Component<Props, State> {
  state: State = {
    previews: [],
  };

  changeView = (view: ApollonView) => this.props.changeView(view);

  toggleInteractiveElementsMode = (event: React.FormEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked ? ApollonView.Exporting : ApollonView.Highlight;

    this.changeView(view);
  };

  onDrop = (element: UMLElement) => (event: DropEvent) => {
    const elements: UMLElement[] = [];

    switch (element.type) {
      case UMLElementType.Class:
      case UMLElementType.AbstractClass:
      case UMLElementType.Interface:
        elements.push(
          new ClassAttribute({ name: this.props.translate('sidebar.classAttribute') }),
          new ClassMethod({ name: this.props.translate('sidebar.classMethod') }),
        );
        break;
      case UMLElementType.Enumeration:
        elements.push(
          new ClassAttribute({ name: this.props.translate('sidebar.enumAttribute') + 1 }),
          new ClassAttribute({ name: this.props.translate('sidebar.enumAttribute') + 2 }),
          new ClassAttribute({ name: this.props.translate('sidebar.enumAttribute') + 3 }),
        );
        break;
      case UMLElementType.ObjectName:
        elements.push(new ObjectAttribute({ name: this.props.translate('sidebar.objectAttribute') }));
        break;
    }

    if (UMLContainerRepository.isUMLContainer(element)) {
      elements.forEach(e => {
        e.owner = element.id;
      });
      element.ownedElements = elements.map(e => e.id);
    }
    elements.unshift(element);

    event.action = {
      type: 'CREATE',
      elements,
    };
    this.refresh();
  };

  componentDidMount() {
    this.refresh();
  }

  render() {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return null;
    return (
      <Container>
        {this.props.mode === ApollonMode.Exporting && (
          <Switch value={this.props.view} onChange={this.changeView} color="primary">
            <Switch.Item value={ApollonView.Modelling}>{this.props.translate('views.modelling')}</Switch.Item>
            <Switch.Item value={ApollonView.Exporting}>{this.props.translate('views.exporting')}</Switch.Item>
          </Switch>
        )}
        {this.props.view === ApollonView.Modelling ? (
          <CanvasProvider value={null}>
            {this.state.previews.map((element, index) => (
              <Draggable key={index} onDrop={this.onDrop(element)}>
                <Preview>
                  <ElementComponent id={element.id} element={element} />
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
            {this.props.translate('views.highlight')}
          </label>
        )}
      </Container>
    );
  }

  private refresh = () => {
    switch (this.props.diagramType) {
      case DiagramType.ClassDiagram:
        this.setState({
          previews: [
            new Package(),
            (() => {
              const c = new Class();
              c.name = this.props.translate('packages.classDiagram.class');
              return c;
            })(),
            (() => {
              const c = new AbstractClass();
              c.name = this.props.translate('packages.classDiagram.abstract');
              return c;
            })(),
            (() => {
              const c = new Interface();
              c.name = this.props.translate('packages.classDiagram.interface');
              return c;
            })(),
            (() => {
              const c = new Enumeration();
              c.name = this.props.translate('packages.classDiagram.enumeration');
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
              c.name = this.props.translate('packages.objectDiagram.objectName');
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
              c.name = this.props.translate('packages.activityDiagram.actionNode');
              return c;
            })(),
            (() => {
              const c = new ActivityObjectNode();
              c.name = this.props.translate('packages.activityDiagram.objectNode');
              return c;
            })(),
            (() => {
              const c = new ActivityMergeNode();
              c.name = this.props.translate('packages.activityDiagram.condition');
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
              c.name = this.props.translate('packages.useCaseDiagram.useCase');
              return c;
            })(),
            (() => {
              const c = new UseCaseActor();
              c.name = this.props.translate('packages.useCaseDiagram.actor');
              return c;
            })(),
            (() => {
              const c = new UseCaseSystem();
              c.name = this.props.translate('packages.useCaseDiagram.system');
              return c;
            })(),
          ],
        });
        break;
      case DiagramType.CommunicationDiagram:
        this.setState({
          previews: [
            (() => {
              const c = new ObjectName();
              c.name = this.props.translate('packages.objectDiagram.objectName');
              return c;
            })(),
          ],
        });
        break;
    }
  };
}

export const Sidebar = enhance(SidebarComponent);
