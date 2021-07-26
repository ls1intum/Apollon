import React, { SFC } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { UMLInterfaceRequired } from './uml-interface-required';
import { Direction, getOppositeDirection } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { REQUIRED_INTERFACE_MARKER_SIZE } from './uml-interface-requires-constants';

type OwnProps = {
  element: UMLInterfaceRequired;
};
type StateProps = {
  hasOppositeRequiredInterface: boolean;
};
type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => {
  // filter all UMLInterfaceRequired
  const requiredInterfaces: UMLInterfaceRequired[] = state.diagram.ownedRelationships
    .map((relationshipId) => state.elements[relationshipId])
    .filter((relationship) => UMLInterfaceRequired.isUMLInterfaceRequired(relationship))
    .map((relationship) => relationship as UMLInterfaceRequired);

  // check if any other UMLInterfaceRequired has the same target as this element and if the direction of the UMLInterfaceRequired is the opposite
  return {
    hasOppositeRequiredInterface: requiredInterfaces
      .filter((element) => element.id !== props.element.id)
      .some(
        (otherRequiredInterface) =>
          otherRequiredInterface.target.element === props.element.target.element &&
          otherRequiredInterface.target.direction.valueOf() ===
            getOppositeDirection(props.element.target.direction).valueOf(),
      ),
  };
}, {});

const UMLInterfaceRequiredC: SFC<Props> = (props: Props) => {
  const { element, hasOppositeRequiredInterface } = props;

  // offset for last point in paragraph, so that line ends at marker
  let offset: Point;
  switch (element.target.direction) {
    case Direction.Up:
      offset = new Point(0, -3);
      break;
    case Direction.Down:
      offset = new Point(0, 3);
      break;
    case Direction.Right:
      offset = new Point(3, 0);
      break;
    case Direction.Left:
      offset = new Point(-3, 0);
      break;
  }

  return (
    <g>
      <marker
        id={`marker-${element.id}`}
        viewBox={`0 0 ${REQUIRED_INTERFACE_MARKER_SIZE} ${REQUIRED_INTERFACE_MARKER_SIZE}`}
        markerWidth={REQUIRED_INTERFACE_MARKER_SIZE}
        markerHeight={REQUIRED_INTERFACE_MARKER_SIZE}
        refX="0"
        refY="0"
        orient="auto"
        markerUnits="strokeWidth"
      >
        {/*M -> Move to, A -> Arc radiusX, radiusY, x-axis-rotation, bow-flag, endpointX,endpointY */}
        <path
          d={`M ${Math.floor(REQUIRED_INTERFACE_MARKER_SIZE / 2) - (hasOppositeRequiredInterface ? 5 : 0)} -${
            (REQUIRED_INTERFACE_MARKER_SIZE - (hasOppositeRequiredInterface ? 2 : 0)) / 2
          } a ${Math.floor(REQUIRED_INTERFACE_MARKER_SIZE / 2)},${Math.floor(
            REQUIRED_INTERFACE_MARKER_SIZE / 2,
          )} 0 0 0 0,${REQUIRED_INTERFACE_MARKER_SIZE - (hasOppositeRequiredInterface ? 2 : 0)}`}
          fill="none"
          stroke={element.strokeColor || 'black'}
          strokeWidth={2}
        />
      </marker>
      <polyline
        points={element.path
          .map((point, index) => {
            if (index === element.path.length - 1) {
              point = new Point(point.x, point.y).add(offset);
            }
            return `${point.x} ${point.y}`;
          })
          .join(',')}
        stroke={element.strokeColor || 'black'}
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${element.id})`}
      />
    </g>
  );
};

export const UMLInterfaceRequiredComponent = enhance(UMLInterfaceRequiredC);
