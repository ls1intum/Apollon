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
  relationship: IUMLRelationship;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    interactive: state.interactive.includes(props.id),
    relationship: state.elements[props.id] as IUMLRelationship,
  }),
  {},
);

export class CanvasRelationshipComponent extends Component<Props> {
  render() {
    const { hovered, selected, interactive, relationship, children, ...props } = this.props;

    const ChildComponent = Components[relationship.type as UMLRelationshipType];

    return (
      <svg {...props} {...relationship.bounds}>
        {/* <ChildComponent element={UMLRelationshipRepository.get(relationship)} /> */}
        {children}
        {/* {(hovered || selected) && (
          <rect
            x={-STROKE / 2}
            y={-STROKE / 2}
            width={element.bounds.width + STROKE}
            height={element.bounds.height + STROKE}
            fill="none"
            stroke="#0064ff"
            strokeOpacity="0.2"
            strokeWidth={STROKE}
            pointerEvents="none"
          />
        )} */}
      </svg>
    );
  }
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
