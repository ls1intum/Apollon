import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Components } from '../../packages/components';
import { UMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { ModelState } from '../store/model-state';

export class RelationshipComponentComponent extends Component<Props> {
  static defaultProps = {
    interactive: false,
    hidden: false,
    moving: false,
    interactable: false,
    disabled: false,
    childComponent: null,
  };

  render() {
    const { element, disabled } = this.props;
    if (element.bounds.width === 1 && element.bounds.height === 1) return null;

    const ElementComponent = Components[element.type];
    const points = element.path.map(point => `${point.x} ${point.y}`).join(',');
    const bounds = element.bounds;

    return (
      <svg
        {...bounds}
        id={element.id}
        pointerEvents={disabled ? 'none' : 'stroke'}
        style={{
          overflow: 'visible',
          opacity: this.props.hidden ? 0 : 1,
        }}
      >
        <polyline
          points={points}
          stroke={!this.props.interactable ? '#0064ff' : this.props.interactive ? '#00dc00' : '#00dc00'}
          strokeOpacity={
            this.props.hovered ||
            (!this.props.interactable && this.props.selected) ||
            (this.props.interactable && this.props.interactive)
              ? 0.2
              : 0
          }
          fill="none"
          strokeWidth={15}
        />
        <ElementComponent element={element} />
        {this.props.children}
      </svg>
    );
  }
}

export interface OwnProps {
  id: string;
  element: UMLRelationship;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  interactable: boolean;
  disabled: boolean;
  childComponent: React.ComponentClass<any> | null;
}

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    interactive: state.interactive.includes(props.id),
  }),
  {},
);

export const RelationshipComponent = enhance(RelationshipComponentComponent);
