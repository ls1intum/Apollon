import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { Direction, IUMLElementPort } from '../../services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { IPoint, Point } from '../../utils/geometry/point';
import { ModelState } from '../store/model-state';
import { getPortsForElement } from '../../services/uml-element/uml-element';
import { styled } from '../theme/styles';

type OwnProps = {
  port: IUMLElementPort;
  target: Point;
};

type StateProps = {
  ports: { [key in Direction]: Point };
};

type DispatchProps = {
  end: AsyncDispatch<typeof UMLElementRepository.endConnecting>;
  getAbsolutePosition: AsyncDispatch<typeof UMLElementRepository.getAbsolutePosition>;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    ports: getPortsForElement(UMLElementRepository.get(state.elements[props.port.element])!),
  }),
  {
    end: UMLElementRepository.endConnecting,
    getAbsolutePosition: UMLElementRepository.getAbsolutePosition as any as AsyncDispatch<
      typeof UMLElementRepository.getAbsolutePosition
    >,
  },
);

const Polyline = styled.polyline`
  stroke: ${(props) => props.theme.color.primaryContrast};
  fill: 'none';
  pointer-events: 'none';
`;

class RelationshipPreview extends Component<Props> {
  render() {
    const { port, ports } = this.props;

    const { x, y }: IPoint = this.props.getAbsolutePosition(port.element);
    const position: IPoint = { ...ports[port.direction] };

    const source = new Point(x + position.x, y + position.y);
    const path = [source, this.props.target];
    const points = path.map((p) => `${p.x} ${p.y}`).join(', ');

    return <Polyline points={points} pointer-events="none" stroke="black" fill="none" strokeDasharray="5,5" />;
  }
}

export const UMLRelationshipPreview: ConnectedComponent<ComponentType<Props>, OwnProps> = enhance(RelationshipPreview);
