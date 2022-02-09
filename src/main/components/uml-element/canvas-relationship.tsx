import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components.js';
import { UMLRelationshipType } from '../../packages/uml-relationship-type.js';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types.js';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship.js';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository.js';
import { ModelState } from '../store/model-state.js';
import { withTheme, withThemeProps } from '../theme/styles.js';
import { UMLElementComponentProps } from './uml-element-component-props.js';

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
  interactable: boolean;
  reconnecting: boolean;
  disabled: boolean;
  relationship: IUMLRelationship;
  mode: ApollonMode;
  scale: number;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const enhance = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      interactive: state.interactive.includes(props.id),
      interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
      reconnecting: !!state.reconnecting[props.id],
      disabled: !!Object.keys(state.reconnecting).length || !!Object.keys(state.connecting).length,
      relationship: state.elements[props.id] as IUMLRelationship,
      mode: state.editor.mode as ApollonMode,
      scale: state.editor.scale || 1.0,
    }),
    {},
  ),
);

export class CanvasRelationshipComponent extends Component<Props> {
  render() {
    const {
      hovered,
      selected,
      interactive,
      interactable,
      reconnecting,
      disabled,
      relationship,
      children,
      theme,
      mode,
      scale,
      ...props
    } = this.props;

    // increase relationship hit box in assessment mode
    const STROKE = mode === ApollonMode.Assessment ? 35 : 15;

    const ChildComponent = Components[relationship.type as UMLRelationshipType];

    const points = relationship.path.map((point) => `${point.x} ${point.y}`).join(',');

    const highlight =
      interactable && interactive
        ? theme.interactive.normal
        : interactable && hovered
        ? theme.interactive.hovered
        : hovered || selected
        ? 'rgba(0, 100, 255, 0.2)'
        : relationship.highlight
        ? relationship.highlight
        : undefined;

    return (
      <svg
        {...props}
        {...relationship.bounds}
        visibility={reconnecting ? 'hidden' : undefined}
        pointerEvents={disabled ? 'none' : 'stroke'}
      >
        <polyline points={points} stroke={highlight} fill="none" strokeWidth={STROKE} />
        <ChildComponent scale={scale} element={UMLRelationshipRepository.get(relationship)} />
        {children}
      </svg>
    );
  }
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
