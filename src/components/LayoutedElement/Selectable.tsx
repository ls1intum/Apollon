import React, { Component } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';

const selectable = (WrappedComponent: typeof ElementComponent) => {
  class Selectable extends Component<Props, State> {
    state: State = {
      selected: false,
    };

    timeout: number | null = null;

    private select = () => {
      if (this.timeout) window.clearTimeout(this.timeout);
      if (this.state.selected) return;
      const element: Element = { ...this.props.element, selected: true };
      this.props.update(element);
      this.setState({ selected: true });
    };

    private deselect = () => {
      if (!this.state.selected) return;

      this.timeout = window.setTimeout(() => {
        const element: Element = { ...this.props.element, selected: false };
        this.props.update(element);
        this.setState({ selected: false });
      }, 0);
    };

    private onMouseDown = (event: MouseEvent) => {
      if (event.which !== 1) return;
      const node = findDOMNode(this) as HTMLElement;
      const nodeListOfHovered = node.querySelectorAll('svg:hover');
      const hovered =
        !nodeListOfHovered.length ||
        (nodeListOfHovered.length &&
          nodeListOfHovered[nodeListOfHovered.length - 1].parentElement &&
          nodeListOfHovered[nodeListOfHovered.length - 1].parentElement ===
            node);

      if (hovered) {
        this.select();
      }
    };

    componentDidMount() {
      const { canvas } = this.props;
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('mousedown', this.onMouseDown);
      canvas.current &&
        canvas.current.addEventListener('mousedown', this.deselect, true);
    }

    componentWillUnmount() {
      const { canvas } = this.props;
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('mousedown', this.onMouseDown);
      canvas.current &&
        canvas.current.removeEventListener('mousedown', this.deselect, true);
    }

    render() {
      return (
        <WrappedComponent {...this.props} selected={this.state.selected} />
      );
    }
  }

  return connect(
    null,
    { update: ElementRepository.update }
  )(Selectable);
};

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & DispatchProps;

interface State {
  selected: boolean;
}

export default selectable;
