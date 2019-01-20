import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { compose } from 'redux';
import ElementComponent, { OwnProps } from './ElementComponent';
import { withPopup, PopupContext } from '../Popup';
import Element from '../../domain/Element';

const editable = (WrappedComponent: typeof ElementComponent) => {
  class Editable extends Component<Props, State> {
    state: State = {
      element: this.props.element,
    };

    private edit = (event: MouseEvent) => {
      event.stopPropagation();
      this.props.showPopup(this.state.element);
    };

    componentDidMount() {
      const node = (findDOMNode(this) as HTMLElement)
        .firstElementChild as HTMLElement;
      node.addEventListener('dblclick', this.edit);
    }

    componentWillUnmount() {
      const node = (findDOMNode(this) as HTMLElement)
        .firstElementChild as HTMLElement;
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

  type Props = OwnProps & PopupContext;

  interface State {
    element: Element;
  }

  return compose<ComponentClass<OwnProps>>(withPopup)(Editable);
};

export default editable;
