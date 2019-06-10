import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { Direction, IUMLElementPort } from '../../services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { ModelState } from '../store/model-state';

type OwnProps = {
  port: IUMLElementPort;
  target: Point;
};

type StateProps = {
  element: IUMLElement;
};

type DispatchProps = {
  end: AsyncDispatch<typeof UMLElementRepository.endConnecting>;
  getAbsolutePosition: AsyncDispatch<typeof UMLElementRepository.getAbsolutePosition>;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    element: state.elements[props.port.element],
  }),
  {
    end: UMLElementRepository.endConnecting,
    // TODO: Fix typescript issue with async actions with a return statement.
    getAbsolutePosition: (UMLElementRepository.getAbsolutePosition as any) as AsyncDispatch<
      typeof UMLElementRepository.getAbsolutePosition
    >,
  },
);

class RelationshipPreview extends Component<Props> {
  render() {
    const { element, port } = this.props;
    if (!element) {
      return null;
    }

    const { x, y } = this.props.getAbsolutePosition(element.id);
    const { width, height } = element.bounds;
    const position = {
      ...(port.direction === Direction.Left
        ? { x: 0 }
        : port.direction === Direction.Right
        ? { x: width }
        : { x: width / 2 }),
      ...(port.direction === Direction.Up
        ? { y: 0 }
        : port.direction === Direction.Down
        ? { y: height }
        : { y: height / 2 }),
    };

    const source = new Point(x + position.x, y + position.y);
    const path = [source, this.props.target];
    const points = path.map(p => `${p.x} ${p.y}`).join(', ');

    return (
      <polyline points={points} pointerEvents="none" fill="none" stroke="black" strokeWidth="1" strokeDasharray="5,5" />
    );
  }
}

export const UMLRelationshipPreview = enhance(RelationshipPreview);
