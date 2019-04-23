import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ClassAttribute } from '../../packages/class-diagram/class-member/class-attribute/class-attribute';
import { ClassMethod } from '../../packages/class-diagram/class-member/class-method/class-method';
import { Class } from '../../packages/class-diagram/classifier/class/class';
import { Package } from '../../packages/common/package/package';
import { UMLDiagramType } from '../../packages/diagram-type';
import { EditorRepository } from '../../services/editor/editor-repository';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLContainer } from '../../services/uml-container/uml-container';
import { UMLContainerRepository } from '../../services/uml-container/uml-container-repository';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { ApollonMode, DiagramType } from '../../typings';
import { Switch } from '../controls/switch/switch';
import { Draggable } from '../draggable/draggable';
import { DropEvent } from '../draggable/drop-event';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { ModelStore } from '../store/model-store';
import { UMLElementFeatures } from '../uml-element/uml-element-component';
import { Container, Preview } from './sidebar-styles';

type OwnProps = {};

type StateProps = {
  type: DiagramType;
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
  changeView: typeof EditorRepository.changeView;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const getInitialState = ({ type, translate }: Props) => {
  const previews: UMLElement[][] = [];
  switch (type) {
    case UMLDiagramType.ClassDiagram: {
      const umlPackage = new Package();
      const umlClass = new Class({ name: translate('packages.classDiagram.class') });
      const umlClassAttribute = new ClassAttribute({
        name: translate('sidebar.classAttribute'),
        owner: umlClass.id,
        bounds: { y: 40 },
      });
      const umlClassMethod = new ClassMethod({
        name: translate('sidebar.classAttribute'),
        owner: umlClass.id,
        bounds: { y: 70 },
      });
      umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
      previews.push([umlPackage], [umlClass, umlClassAttribute, umlClassMethod]);
    }
  }

  return { previews };
};

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      type: state.diagram.type,
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
  state = getInitialState(this.props);

  render() {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return null;

    const { previews } = this.state;

    const elements = previews.reduce<UMLElementState>(
      (elements, preview) => ({
        ...elements,
        ...preview.reduce<UMLElementState>((previews, element) => ({ ...previews, [element.id]: element }), {}),
      }),
      {},
    );
    const features: UMLElementFeatures = {
      hoverable: false,
      selectable: false,
      movable: false,
      resizable: false,
      connectable: false,
    };

    return (
      <Container>
        {this.props.mode === ApollonMode.Exporting && (
          <Switch value={this.props.view} onChange={this.changeView} color="primary">
            <Switch.Item value={ApollonView.Modelling}>{this.props.translate('views.modelling')}</Switch.Item>
            <Switch.Item value={ApollonView.Exporting}>{this.props.translate('views.exporting')}</Switch.Item>
          </Switch>
        )}
        {this.props.view === ApollonView.Modelling ? (
          <ModelStore initialState={{ elements, features }}>
            {previews.map((preview, index) => (
              <Draggable key={index} onDrop={this.create(preview)}>
                <Preview id={preview[0].id} />
              </Draggable>
            ))}
          </ModelStore>
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

  changeView = (view: ApollonView) => this.props.changeView(view);

  toggleInteractiveElementsMode = (event: React.FormEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked ? ApollonView.Exporting : ApollonView.Highlight;

    this.changeView(view);
  };

  create = (preview: UMLElement[]) => (event: DropEvent) => {
    if (!preview.length) {
      return;
    }

    const clonePreview = (element: UMLElement): UMLElement[] => {
      if (!UMLContainerRepository.isUMLContainer(element)) {
        return [element.clone()];
      }

      const result: UMLElement[] = [];
      const clone = element.clone<UMLContainer>();
      const { ownedElements } = element;
      for (const id of ownedElements) {
        const child = preview.find(prev => prev.id === id);
        if (!child) {
          continue;
        }

        const [clonedChild, ...clonedChildren] = clonePreview(child);
        clonedChild.owner = clone.id;

        const index = clone.ownedElements.findIndex(x => x === id);
        clone.ownedElements[index] = clonedChild.id;
        result.push(clonedChild, ...clonedChildren);
      }

      return [clone, ...result];
    };

    event.action = {
      type: 'CREATE',
      elements: clonePreview(preview[0]),
    };
  };
}

export const Sidebar = enhance(SidebarComponent);
