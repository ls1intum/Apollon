import React, { SFC } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { UMLInterfaceRequired } from './uml-interface-required';
import { getOppositeDirection } from '../../../services/uml-element/uml-element-port';

const SIZE = 26;

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
  return (
    <g>
      <marker
        id={`marker-${element.id}`}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        markerWidth={SIZE}
        markerHeight={SIZE}
        refX="0"
        refY="0"
        orient="auto"
        markerUnits="strokeWidth"
        strokeDasharray="1,0"
      >
        {/*M -> Move to, A -> Arc radiusX, radiusY, x-axis-rotation, bow-flag, endpointX,endpointY */}
        <path
          d={`M ${SIZE / 2 - (hasOppositeRequiredInterface ? 9 : 3)} -${
            (SIZE - (hasOppositeRequiredInterface ? 2 : 0)) / 2
          } a ${SIZE / 2},${SIZE / 2} 0 0 0 0,${SIZE - (hasOppositeRequiredInterface ? 2 : 0)}`}
          fill="none"
          stroke="black"
          strokeWidth={2}
        />
      </marker>
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${element.id})`}
      />
    </g>
  );
};

export const UMLInterfaceRequiredComponent = enhance(UMLInterfaceRequiredC);
