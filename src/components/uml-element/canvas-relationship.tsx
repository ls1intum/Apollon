import React, { Component, SVGProps } from 'react';
import { connect } from 'react-redux';
import { Components } from '../../packages/components';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { ModelState } from '../store/model-state';
import { UMLElementComponentProps } from './uml-element-component';

const STROKE = 5;

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
  reconnecting: boolean;
  disabled: boolean;
  relationship: IUMLRelationship;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    interactive: state.interactive.includes(props.id),
    reconnecting: !!state.reconnecting[props.id],
    disabled: !!Object.keys(state.reconnecting).length,
    relationship: state.elements[props.id] as IUMLRelationship,
  }),
  {},
);

export class CanvasRelationshipComponent extends Component<Props> {
  render() {
    const { hovered, selected, interactive, reconnecting, disabled, relationship, children, ...props } = this.props;

    const ChildComponent = Components[relationship.type as UMLRelationshipType];

    const points = relationship.path.map(point => `${point.x} ${point.y}`).join(',');

    return (
      <svg
        {...props}
        {...relationship.bounds}
        visibility={reconnecting ? 'hidden' : undefined}
        pointerEvents={disabled ? 'none' : undefined}
      >
        <ChildComponent element={UMLRelationshipRepository.get(relationship)} />
        <polyline
          points={points}
          stroke="#0064ff"
          strokeOpacity={hovered || selected ? 0.2 : 0}
          fill="none"
          strokeWidth={15}
        />
        {children}
      </svg>
    );
  }
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
