import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Relationship } from '../../services/relationship/relationship';
import { PopupContext, withPopup } from '../popup/popup-context';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

export const editable = (WrappedComponent: typeof ElementComponent) => {
  class Editable extends Component<Props, State> {
    state: State = {
      element: this.props.element,
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('dblclick', this.edit);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dblclick', this.edit);
    }

    componentDidUpdate(prevProps: Props) {
      if (prevProps.element !== this.props.element) {
        this.setState({ element: this.props.element }, () => this.props.update(this.state.element));
      }
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }

    private edit = (event: MouseEvent) => {
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
        let { x, y } = this.props.element.bounds;
        const { width } = this.props.element.bounds;
        let ownerID = this.props.element.owner;
        while (ownerID) {
          const owner = this.props.getById(ownerID);
          if (!owner) break;
          x += owner.bounds.x;
          y += owner.bounds.y;
          ownerID = owner.owner;
        }
        position = { x: x + width, y };
      }
      this.props.showPopup(this.state.element, position);
    };
  }

  type StateProps = {
    getById: (id: string) => Element | null;
  };

  type DispatchProps = {};

  type Props = OwnProps & StateProps & DispatchProps & PopupContext;

  type State = {
    element: Element;
  };

  return compose<ComponentClass<OwnProps>>(
    withPopup,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
      getById: ElementRepository.getById(state.elements),
    })),
  )(Editable);
};
