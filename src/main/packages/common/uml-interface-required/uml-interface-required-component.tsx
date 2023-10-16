import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { UMLInterfaceRequired } from './uml-interface-required';
import { Direction, getOppositeDirection } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { REQUIRED_INTERFACE_MARKER_SIZE, REQUIRED_INTERFACE_MARKER_TYPE } from './uml-interface-requires-constants';
import { ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';

type OwnProps = {
  element: UMLInterfaceRequired;
};
type StateProps = {
  hasOppositeRequiredInterface: boolean;
  currentRequiredInterfaces: UMLInterfaceRequired[];
  currentAllInterfaces: any;
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
    currentRequiredInterfaces: requiredInterfaces.filter(
      (element) => element.target.element === props.element.target.element,
    ),
    currentAllInterfaces: state.diagram.ownedRelationships
      .map((relationshipId) => state.elements[relationshipId])
      .filter((element: any) => element.target.element === props.element.target.element),
  };
}, {});

const UMLInterfaceRequiredC: FunctionComponent<Props> = (props: Props) => {
  const { element, hasOppositeRequiredInterface, currentRequiredInterfaces, currentAllInterfaces } = props;

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

  const calculatePath = () => {
    let path = '';
    switch (currentRequiredInterfaces.length) {
      case 1:
        path =
          currentAllInterfaces.length === currentRequiredInterfaces.length
            ? REQUIRED_INTERFACE_MARKER_TYPE.Semicircle
            : REQUIRED_INTERFACE_MARKER_TYPE.Threequarterscircle;
        break;

      case 2:
        path = hasOppositeRequiredInterface
          ? REQUIRED_INTERFACE_MARKER_TYPE.Threequarterscircle
          : REQUIRED_INTERFACE_MARKER_TYPE.Quartercircle;
        break;

      default:
        path = REQUIRED_INTERFACE_MARKER_TYPE.Quartercircle;
        break;
    }

    return path;
  };

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
        <ThemedPath d={calculatePath()} fillColor="none" strokeColor={element.strokeColor} strokeWidth={2} />
      </marker>
      <ThemedPolyline
        points={element.path
          .map((point, index) => {
            if (index === element.path.length - 1) {
              point = new Point(point.x, point.y).add(offset);
            }
            return `${point.x} ${point.y}`;
          })
          .join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1.0}
        markerEnd={`url(#marker-${element.id})`}
      />
    </g>
  );
};

export const UMLInterfaceRequiredComponent = enhance(UMLInterfaceRequiredC);
