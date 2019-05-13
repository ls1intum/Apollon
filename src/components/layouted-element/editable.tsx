import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Relationship } from '../../services/relationship/relationship';
import { Point } from '../../utils/geometry/point';
import { PopupContext, withPopup } from '../popup/popup-context';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

export const editable = (WrappedComponent: typeof ElementComponent) => {
  class Editable extends Component<Props, State> {
    state: State = {
      element: this.props.element,
      lastEvent: null,
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('pointerdown', this.edit);
    }

    componentWillUnmount() {
      this.props.dissmiss();
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerdown', this.edit);
    }

    componentDidUpdate(prevProps: Props) {
      if (prevProps.element !== this.props.element) {
        this.setState({ element: this.props.element }, () => this.props.update(this.state.element));
      }
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }

    private edit = (event: PointerEvent) => {
      const { lastEvent } = this.state;
      if (!lastEvent || Date.now() - lastEvent > 300) {
        this.setState({ lastEvent: Date.now() });
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      let position = { x: 0, y: 0 };
      if (this.props.element instanceof Relationship) {
        const { bounds } = this.props.element;
        const path = this.props.element.path;
        const targetPoint = path[path.length - 2];
        position = {
          x: targetPoint.x + bounds.x,
          y: targetPoint.y + bounds.y - 20,
        };
      } else {
        const { x, y } = this.props.getAbsolutePosition(this.props.element.id);
        const { width } = this.props.element.bounds;
        position = { x: x + width, y };
      }
      this.props.showPopup(this.state.element, position);
    };
  }

  type StateProps = {
    getById: (id: string) => Element | null;
    getAbsolutePosition: (id: string) => Point;
  };

  type DispatchProps = {};

  type Props = OwnProps & StateProps & DispatchProps & PopupContext;

  type State = {
    element: Element;
    lastEvent: number | null;
  };

  return compose<ComponentClass<OwnProps>>(
    withPopup,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
      getById: ElementRepository.getById(state.elements),
      getAbsolutePosition: ElementRepository.getAbsolutePosition(state.elements),
    })),
  )(Editable);
};
