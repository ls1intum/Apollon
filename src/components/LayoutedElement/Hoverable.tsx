import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import ElementComponent, { OwnProps } from './ElementComponent';

const hoverable = (WrappedComponent: typeof ElementComponent) => {
  class Hoverable extends Component<Props, State> {
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
      const { bounds } = this.props.element;
      const strokeWidth = 5;
      return (
        <WrappedComponent {...this.props} hovered={this.state.hovered}>
          {this.props.children}
          {this.state.hovered && (
            <rect
              x={-strokeWidth / 2}
              y={-strokeWidth / 2}
              width={bounds.width + strokeWidth}
              height={bounds.height + strokeWidth}
              fill="none"
              stroke="#0064ff"
              strokeOpacity="0.2"
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
          )}
        </WrappedComponent>
      );
    }
  }

  type Props = OwnProps;

  interface State {
    hovered: boolean;
  }

  return Hoverable;
};

export default hoverable;
