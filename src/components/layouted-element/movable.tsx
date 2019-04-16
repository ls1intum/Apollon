import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ContainerRepository } from '../../services/container/container-repository';
import { IElement } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Point } from '../../utils/geometry/point';
import { CanvasContext, withCanvas } from '../canvas/canvas-context';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

export const movable = (WrappedComponent: typeof ElementComponent) => {
  class Movable extends Component<Props, State> {
    state: State = {
      movable: false,
      moving: false,
      offset: new Point(),
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.addEventListener('pointerdown', this.onMouseDown);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.removeEventListener('pointerdown', this.onMouseDown);
    }

    render() {
      return <WrappedComponent {...this.props} moving={this.state.moving} />;
    }

    private move = (x: number, y: number) => {
      const { bounds } = this.props.element;
      if (bounds.x === x && bounds.y === y) return;

      this.props.move(null, {
        x: x - this.props.element.bounds.x,
        y: y - this.props.element.bounds.y,
      });
    };

    private checkOwnership = () => {
      const target = this.props.target ? this.props.target.id : null;
      this.props.changeOwner(this.props.element.id, target);
    };

    private onMouseDown = (event: PointerEvent) => {
      if (event.which && event.which !== 1) return;
      const target = event.currentTarget as HTMLElement;
      window.setTimeout(() => {
        if (!this.props.element.selected) return;
        const rect = target.getBoundingClientRect();
        const offset = this.props.coordinateSystem.offset();
        offset.x += event.clientX - rect.left;
        offset.y += event.clientY - rect.top;

        const position = this.props.getAbsolutePosition(this.props.element.id);
        offset.x += position.x - this.props.element.bounds.x;
        offset.y += position.y - this.props.element.bounds.y;

        this.setState({ movable: true, offset });
      }, 0);
      document.addEventListener('pointermove', this.onMouseMove);
      document.addEventListener('pointerup', this.onMouseUp);
    };

    private onMouseMove = (event: PointerEvent) => {
      if (!this.state.movable) return;
      const x = event.clientX - this.state.offset.x;
      const y = event.clientY - this.state.offset.y;

      if (!this.state.moving) {
        const { bounds } = this.props.element;
        if (Math.abs(bounds.x - x) > 5 || Math.abs(bounds.y - y) > 5) {
          this.setState({ moving: true });
        }
      } else {
        const point = this.props.coordinateSystem.screenToPoint(x, y);
        this.move(point.x, point.y);
      }
    };

    private onMouseUp = () => {
      const { moving } = this.state;
      this.setState({ movable: false, moving: false, offset: new Point() });
      document.removeEventListener('pointermove', this.onMouseMove);
      document.removeEventListener('pointerup', this.onMouseUp);
      if (moving) this.checkOwnership();
    };
  }

  interface StateProps {
    getAbsolutePosition: (id: string) => Point;
    target: IElement | undefined;
  }

  interface DispatchProps {
    move: typeof ElementRepository.move;
    changeOwner: typeof ContainerRepository.changeOwner;
  }

  type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

  interface State {
    movable: boolean;
    moving: boolean;
    offset: Point;
  }

  return compose<ComponentClass<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(
      state => ({
        getAbsolutePosition: ElementRepository.getAbsolutePosition(state.elements),
        target: Object.values(state.elements).find(element => element.hovered),
      }),
      {
        move: ElementRepository.move,
        changeOwner: ContainerRepository.changeOwner,
      },
    ),
  )(Movable);
};
