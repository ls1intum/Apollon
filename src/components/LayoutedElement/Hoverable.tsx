import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import ElementComponent, { OwnProps } from './ElementComponent';

const hoverable = (WrappedComponent: typeof ElementComponent) => {
  return class Hoverable extends Component<OwnProps, State> {
    state: State = {
      hovered: false,
    };

    private enter = () => this.setState({ hovered: true });

    private leave = () => this.setState({ hovered: false });

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('mouseenter', this.enter);
      node.addEventListener('mouseleave', this.leave);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('mouseenter', this.enter);
      node.removeEventListener('mouseleave', this.leave);
    }

    render() {
      return <WrappedComponent {...this.props} hovered={this.state.hovered} />;
    }
  };
};

interface State {
  hovered: boolean;
}

export default hoverable;
