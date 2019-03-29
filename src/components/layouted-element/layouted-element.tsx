import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Container } from '../../services/container/container';
import { ApollonView } from '../../services/editor/editor-types';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { ApollonMode } from '../../typings';
import { ModelState } from '../store/model-state';
import { assessable } from './assessable';
import { connectable } from './connectable';
import { droppable } from './droppable';
import { editable } from './editable';
import { ElementComponent, OwnProps as ComponentProps } from './element-component';
import { hoverable } from './hoverable';
import { interactable } from './interactable';
import { movable } from './movable';
import { resizable } from './resizable';
import { selectable } from './selectable';

class LayoutedElementComponent extends Component<Props> {
  static defaultProps = {
    disabled: false,
  };

  component: typeof ElementComponent = this.composeComponent();

  componentDidUpdate(prevProps: Props) {
    if (prevProps.view !== this.props.view) {
      this.component = this.composeComponent();
      this.forceUpdate();
    }
  }

  render() {
    const ElementComponents = this.component;
    const element = this.props.getById(this.props.element);
    if (!element) return null;
    return (
      <ElementComponents
        childComponent={LayoutedElement}
        element={element}
        disabled={this.props.disabled}
        interactable={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
        hidden={this.props.view === ApollonView.Highlight && element.interactive}
      />
    );
  }

  private composeComponent(): typeof ElementComponent {
    const { readonly, view, mode } = this.props;
    type DecoratorType = (Component: typeof ElementComponent) => React.ComponentClass<ComponentProps>;
    let decorators: DecoratorType[] = [];

    if (mode === ApollonMode.Assessment) {
      decorators = [assessable, editable, selectable, hoverable];
    } else if (readonly) {
      decorators = [selectable, hoverable];
    } else if (view === ApollonView.Exporting || view === ApollonView.Highlight) {
      decorators = [interactable, hoverable];
    } else {
      const element = this.props.getById(this.props.element);
      if (element) {
        const { features } = element.constructor as typeof Element;
        if (features.editable) decorators.push(editable);
        if (element instanceof Container && (element.constructor as typeof Container).features.droppable) decorators.push(droppable);
        if (features.connectable) decorators.push(connectable);
        if (features.resizable !== 'NONE') decorators.push(resizable);
        if (features.movable) decorators.push(movable);
        if (features.selectable) decorators.push(selectable);
        if (features.hoverable) decorators.push(hoverable);
      }
    }

    return compose<typeof ElementComponent>(...decorators)(ElementComponent);
  }
}

type OwnProps = {
  element: string;
  disabled: boolean;
};

type StateProps = {
  getById: (id: string) => Element | null;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
};

type Props = OwnProps & StateProps;

const mapStateToProps = (state: ModelState): StateProps => ({
  getById: ElementRepository.getById(state.elements),
  readonly: state.editor.readonly,
  view: state.editor.view,
  mode: state.editor.mode,
});

const enhance = connect(mapStateToProps);

export const LayoutedElement = enhance(LayoutedElementComponent);
