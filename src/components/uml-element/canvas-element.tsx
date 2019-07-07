import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { Components } from '../../packages/components';
import { UMLElementType } from '../../packages/uml-element-type';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { UMLElementComponentProps } from './uml-element-component-props';

const STROKE = 5;

type OwnProps = { child?: ComponentClass<UMLElementComponentProps> } & UMLElementComponentProps &
  SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  moving: boolean;
  interactive: boolean;
  interactable: boolean;
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
    interactable: state.editor.view === ApollonView.Exporting,
    element: state.elements[props.id],
  }),
  {},
);

export class CanvasElementComponent extends Component<Props> {
  render() {
    const {
      hovered,
      selected,
      moving,
      interactive,
      interactable,
      element,
      child: Child,
      children,
      ...props
    } = this.props;

    let elements = null;
    if (UMLContainer.isUMLContainer(element) && Child) {
      elements = element.ownedElements.map(id => <Child key={id} id={id} />);
    }
    const ChildComponent = Components[element.type as UMLElementType];

    return (
      <svg
        {...props}
        {...element.bounds}
        pointerEvents={moving ? 'none' : undefined}
        fillOpacity={moving ? 0.7 : undefined}
        fill={(interactable && ((interactive && '#D0F4C5') || (hovered && '#E8F9E3'))) || undefined}
      >
        <ChildComponent element={UMLElementRepository.get(element)}>{elements}</ChildComponent>
        {children}
        {!interactable && (hovered || selected) && (
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
