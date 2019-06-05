import React, { Component, SVGProps } from 'react';
import { connect } from 'react-redux';
import { Components } from '../../packages/components';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLContainerRepository } from '../../services/uml-container/uml-container-repository';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { UMLElementComponent, UMLElementComponentProps } from './uml-element-component';

const STROKE = 5;

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  moving: boolean;
  interactive: boolean;
  element: IUMLElement;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    moving: state.moving.includes(props.id),
    interactive: state.interactive.includes(props.id),
    element: state.elements[props.id],
  }),
  {},
);

export class CanvasElementComponent extends Component<Props> {
  render() {
    const { hovered, selected, moving, interactive, element, children, ...props } = this.props;

    let elements = null;
    if (UMLContainerRepository.isUMLContainer(element)) {
      elements = element.ownedElements.map(id => <UMLElementComponent key={id} id={id} component="canvas" />);
    }
    const ChildComponent = Components[element.type as UMLElementType];

    return (
      <svg {...props} {...element.bounds} pointerEvents={moving ? 'none' : undefined} fillOpacity={moving ? 0.7 : 1}>
        <ChildComponent element={UMLElementRepository.get(element)}>{elements}</ChildComponent>
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

export const CanvasElement = enhance(CanvasElementComponent);
