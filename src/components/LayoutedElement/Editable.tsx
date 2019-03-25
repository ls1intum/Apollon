import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import ElementComponent, { OwnProps } from './ElementComponent';
import { withPopup, PopupContext } from '../Popup';
import Element, { ElementRepository } from '../../domain/Element';
import Relationship from '../../domain/Relationship';

const editable = (WrappedComponent: typeof ElementComponent) => {
  class Editable extends Component<Props, State> {
    state: State = {
      element: this.props.element,
    };

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
        let { x, y, width, height } = this.props.element.bounds;
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
        this.setState({ element: this.props.element }, () =>
          this.props.update(this.state.element)
        );
      }
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  interface StateProps {
    getById: (id: string) => Element | null;
  }

  interface DispatchProps {}

  type Props = OwnProps & StateProps & DispatchProps & PopupContext;

  interface State {
    element: Element;
  }

  return compose<ComponentClass<OwnProps>>(
    withPopup,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
      getById: ElementRepository.getById(state.elements),
    }))
  )(Editable);
};

export default editable;
