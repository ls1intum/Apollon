import React, { Component, ComponentType, SVGProps } from 'react';
import { connect } from 'react-redux';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { ModelState } from '../store/model-state';
import { UMLElementComponentProps } from './uml-element-component';

const STROKE = 5;

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
  element: IUMLElement;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    interactive: state.interactive.includes(props.id),
    element: state.elements[props.id],
  }),
  {},
);

class CanvasElementComponent extends Component<Props> {
  render() {
    const { hovered, selected, interactive, element, children, ...props } = this.props;
    if (!element) {
      return null;
    }

    return (
      <svg {...props} {...element.bounds}>
        <rect width={element.bounds.width} height={element.bounds.height} fill="red" fillOpacity={0.2} />
        {children}
        {(hovered || selected) && (
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
        )}
      </svg>
    );
  }
}

export const CanvasElement = enhance(CanvasElementComponent) as ComponentType<OwnProps>;
