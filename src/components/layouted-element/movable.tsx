import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { ModelState } from '../store/model-state';
import { css, styled } from '../theme/styles';
import { ElementComponent, OwnProps } from './element-component';

type StateProps = {
  selected: boolean;
  // target: IElement | undefined;
};

type DispatchProps = {
  moveStart: typeof UMLElementRepository.moveStart;
  move: AsyncDispatch<typeof UMLElementRepository.moveSelection>;
  moveEnd: typeof UMLElementRepository.moveEnd;
  // changeOwner: typeof UMLContainerRepository.changeOwner;
};

type Props = OwnProps & StateProps & DispatchProps;

const initialState = {
  moving: false,
  offset: new Point(),
};

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    selected: state.selected.includes(props.id),
  }),
  {
    moveStart: UMLElementRepository.moveStart,
    move: UMLElementRepository.moveSelection,
    moveEnd: UMLElementRepository.moveEnd,
    // changeOwner: UMLContainerRepository.changeOwner,
  },
);

export const movable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  const StyledWrappedComponent = styled(WrappedComponent)<{ moving: boolean }>(
    props =>
      props.moving &&
      css`
        opacity: 0.35;
      `,
  );

  class Movable extends Component<Props, State> {
    state = initialState;

    move = (x: number, y: number) => {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      if (x === 0 && y === 0) return;

      this.setState(state => ({ offset: state.offset.add(x, y) }));
      this.props.move({ x, y });
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      console.log(child);
      child.addEventListener('pointerdown', this.onPointerDown);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      const child = node.firstChild as HTMLElement;
      child.removeEventListener('pointerdown', this.onPointerDown);
    }

    render() {
      return <StyledWrappedComponent moving={this.state.moving} {...this.props} />;
    }

    private checkOwnership = () => {
      // const target = this.props.target ? this.props.target.id : null;
      // this.props.changeOwner(this.props.element.id, target);
    };

    private onPointerDown = (event: PointerEvent) => {
      if (event.which && event.which !== 1) {
        return;
      }

      this.setState({ offset: new Point(event.clientX, event.clientY) });
      setTimeout(() => {
        if (!this.props.selected) {
          return;
        }

        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp, { once: true });
      }, 0);
    };

    private onPointerMove = (event: PointerEvent) => {
      const x = event.clientX - this.state.offset.x;
      const y = event.clientY - this.state.offset.y;

      if (!this.state.moving) {
        if (Math.abs(x) > 5 || Math.abs(y) > 5) {
          this.setState({ moving: true });
          this.props.moveStart(this.props.id);
        }
      } else {
        this.move(x, y);
      }
    };

    private onPointerUp = () => {
      this.setState(initialState);
      this.props.moveEnd(this.props.id);
      document.removeEventListener('pointermove', this.onPointerMove);
      // if (moving) this.checkOwnership();
    };
  }

  return enhance(Movable);
};
